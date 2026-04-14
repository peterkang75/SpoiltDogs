import { Server as SocketIOServer, Socket } from "socket.io";
import type { Server as HTTPServer } from "http";
import { storage } from "./storage";

let io: SocketIOServer | null = null;
const profileToVisitorRoom = new Map<string, string>();
const emailToVisitorRoom = new Map<string, string>();

export function getIO(): SocketIOServer | null {
  return io;
}

export function getVisitorRoom(profileId: string): string | undefined {
  return profileToVisitorRoom.get(profileId);
}

export function getVisitorRoomByEmail(email: string): string | undefined {
  return emailToVisitorRoom.get(email.toLowerCase().trim());
}

export function setupChat(httpServer: HTTPServer) {
  io = new SocketIOServer(httpServer, {
    cors: { origin: "*", methods: ["GET", "POST"] },
    path: "/socket.io",
  });

  io.on("connection", async (socket: Socket) => {
    const visitorId = socket.handshake.query.visitorId as string || socket.id;
    const rawEmail = socket.handshake.query.email as string || `visitor-${visitorId}@chat.spoiltdogs.com.au`;
    const visitorEmail = rawEmail.toLowerCase().trim();
    const roomName = `visitor:${visitorId}`;

    socket.join(roomName);
    socket.join("chat:all");

    emailToVisitorRoom.set(visitorEmail, roomName);

    try {
      const existingProfile = await storage.getProfileByEmail(visitorEmail);
      if (existingProfile) {
        profileToVisitorRoom.set(existingProfile.id, roomName);
      }
    } catch {}

    socket.on("chat:message", async (data: { text: string; visitorName?: string }) => {
      try {
        let profile = await storage.getProfileByEmail(visitorEmail);
        if (!profile) {
          profile = await storage.createProfile({ email: visitorEmail, name: data.visitorName || null });
        } else if (data.visitorName && !profile.name) {
          profile = (await storage.updateProfile(profile.id, { name: data.visitorName })) || profile;
        }

        profileToVisitorRoom.set(profile.id, roomName);
        emailToVisitorRoom.set(visitorEmail, roomName);

        const message = await storage.createMessage({
          profileId: profile.id,
          direction: "incoming",
          subject: null,
          body: data.text,
          toEmail: "hello@spoiltdogs.com.au",
          fromEmail: visitorEmail,
          resendId: null,
          status: "chat",
        });

        socket.emit("chat:message:ack", { id: message.id, createdAt: message.createdAt });

        io?.to("admin:crm").emit("chat:new-message", {
          message,
          profile,
        });
      } catch (err: any) {
        console.error("Chat message error:", err.message);
        socket.emit("chat:error", { error: "Failed to send message" });
      }
    });

    socket.on("admin:join", () => {
      socket.join("admin:crm");
    });

    socket.on("admin:reply", async (data: { profileId: string; text: string }) => {
      try {
        const profile = await storage.getProfile(data.profileId);
        if (!profile) return;

        const message = await storage.createMessage({
          profileId: data.profileId,
          direction: "outgoing",
          subject: null,
          body: data.text,
          toEmail: profile.email,
          fromEmail: "hello@spoiltdogs.com.au",
          resendId: null,
          status: "chat",
        });

        const targetRoom = profileToVisitorRoom.get(data.profileId) || emailToVisitorRoom.get(profile.email.toLowerCase().trim());
        if (targetRoom) {
          io?.to(targetRoom).emit("chat:reply", {
            text: data.text,
            id: message.id,
            createdAt: message.createdAt,
          });
        }

        io?.to("admin:crm").emit("chat:new-message", {
          message,
          profile,
        });
      } catch (err: any) {
        console.error("Admin reply error:", err.message);
      }
    });

    socket.on("disconnect", () => {});
  });

  return io;
}
