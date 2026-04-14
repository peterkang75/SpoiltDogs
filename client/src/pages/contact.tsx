import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Navbar } from "@/components/navbar";
import { SiteFooter } from "@/components/site-footer";
import { MarqueeBanner } from "@/components/marquee-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Link } from "wouter";
import { ChevronRight, Mail, Phone, MapPin, Clock, Send, CheckCircle2, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const contactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().max(30).optional().or(z.literal("")),
  subject: z.string().min(2, "Subject must be at least 2 characters").max(200),
  message: z.string().min(10, "Message must be at least 10 characters").max(3000),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const subjectOptions = [
  "General Enquiry",
  "Order Status",
  "Product Question",
  "Returns & Refunds",
  "Bulk / Wholesale",
  "Press & Partnerships",
  "Other",
];

const contactInfo = [
  {
    icon: Mail,
    label: "Email",
    value: "hello@spoiltdogs.com.au",
    href: "mailto:hello@spoiltdogs.com.au",
  },
  {
    icon: Phone,
    label: "Phone",
    value: "1300 SPOILT",
    href: "tel:1300776458",
  },
  {
    icon: MapPin,
    label: "Location",
    value: "Sydney, NSW, Australia",
    href: null,
  },
  {
    icon: Clock,
    label: "Response Time",
    value: "Within 1–2 business days",
    href: null,
  },
];

export default function ContactUs() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (values: ContactFormValues) => {
    setSubmitting(true);
    try {
      await apiRequest("POST", "/api/contact", {
        ...values,
        phone: values.phone || undefined,
      });
      setSubmitted(true);
    } catch (err: any) {
      const msg = err?.message ?? "Something went wrong. Please try again.";
      toast({ title: "Failed to send message", description: msg, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen" style={{ backgroundColor: "#FCF9F1" }}>
      <MarqueeBanner />
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-dark/40 mb-6" data-testid="contact-breadcrumb">
          <Link href="/" className="hover:text-dark/60 transition-colors">Home</Link>
          <ChevronRight className="h-3 w-3" />
          <span className="text-dark/70">Contact Us</span>
        </nav>

        {/* Page header */}
        <div className="mb-10 sm:mb-14 text-center max-w-2xl mx-auto space-y-3">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#F37052" }}>
            Get in Touch
          </p>
          <h1 className="font-serif font-bold text-dark" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }} data-testid="heading-contact">
            We'd love to hear from you
          </h1>
          <p className="text-dark/55 leading-relaxed">
            Whether you have a question about an order, need help choosing the right product for your pup, or just want to say hello — we're here for it.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">

          {/* LEFT — Contact info cards */}
          <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-24">
            {contactInfo.map(({ icon: Icon, label, value, href }) => (
              <div
                key={label}
                className="flex items-start gap-4 rounded-2xl p-5"
                style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)" }}
                data-testid={`contact-info-${label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "#E3EDE6" }}
                >
                  <Icon className="h-5 w-5" style={{ color: "#4B9073" }} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-dark/40 mb-0.5">{label}</p>
                  {href ? (
                    <a href={href} className="text-sm font-semibold text-dark hover:text-sage transition-colors" style={{ color: "#1a3a2e" }}>
                      {value}
                    </a>
                  ) : (
                    <p className="text-sm font-semibold" style={{ color: "#1a3a2e" }}>{value}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Little brand note */}
            <div
              className="rounded-2xl p-5"
              style={{ backgroundColor: "#1a3a2e" }}
            >
              <p className="font-serif font-bold text-white text-base mb-1.5">Proudly Australian</p>
              <p className="text-white/60 text-sm leading-relaxed">
                SpoiltDogs is based in Sydney, NSW. We source premium products crafted right here in Australia for Australian pets and their families.
              </p>
            </div>
          </div>

          {/* RIGHT — Form or Success */}
          <div className="lg:col-span-8">
            <div
              className="rounded-3xl p-7 sm:p-10"
              style={{ backgroundColor: "#FFFFFF", border: "1px solid rgba(0,0,0,0.06)", boxShadow: "0 4px 32px rgba(0,0,0,0.05)" }}
            >
              {submitted ? (
                /* Success state */
                <div className="py-12 text-center space-y-5" data-testid="contact-success">
                  <div className="flex justify-center">
                    <div
                      className="h-20 w-20 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: "#E3EDE6" }}
                    >
                      <CheckCircle2 className="h-10 w-10" style={{ color: "#4B9073" }} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h2 className="font-serif text-2xl font-bold text-dark">Message Sent!</h2>
                    <p className="text-dark/55 max-w-sm mx-auto leading-relaxed">
                      Thank you for reaching out. We'll get back to you within 1–2 business days.
                      Keep an eye on your inbox — we've also sent you a confirmation email.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
                    <button
                      onClick={() => { setSubmitted(false); form.reset(); }}
                      className="text-sm font-medium underline underline-offset-4 text-dark/50 hover:text-dark transition-colors"
                      data-testid="button-send-another"
                    >
                      Send another message
                    </button>
                    <Link href="/products">
                      <Button
                        className="rounded-full px-8"
                        style={{ backgroundColor: "#4B9073", color: "#fff", border: "none" }}
                        data-testid="button-go-shopping"
                      >
                        Browse the Shop
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                /* Form */
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" data-testid="contact-form">
                    <div>
                      <h2 className="font-serif text-xl font-bold text-dark mb-1">Send us a message</h2>
                      <p className="text-sm text-dark/45">All fields marked * are required.</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {/* Name */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-dark/70">Full Name *</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Jane Smith"
                                {...field}
                                className="rounded-xl border-dark/10 bg-stone-50/60 focus:bg-white transition-colors"
                                data-testid="input-contact-name"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Email */}
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-dark/70">Email Address *</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="jane@example.com"
                                {...field}
                                className="rounded-xl border-dark/10 bg-stone-50/60 focus:bg-white transition-colors"
                                data-testid="input-contact-email"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Phone */}
                      <FormField
                        control={form.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-dark/70">Phone Number <span className="font-normal text-dark/35">(optional)</span></FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="04xx xxx xxx"
                                {...field}
                                className="rounded-xl border-dark/10 bg-stone-50/60 focus:bg-white transition-colors"
                                data-testid="input-contact-phone"
                              />
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />

                      {/* Subject */}
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm font-semibold text-dark/70">Subject *</FormLabel>
                            <FormControl>
                              <select
                                {...field}
                                className="flex h-10 w-full rounded-xl border border-dark/10 bg-stone-50/60 px-3 py-2 text-sm text-dark focus:outline-none focus:ring-2 focus:ring-sage/30 focus:bg-white transition-colors"
                                data-testid="select-contact-subject"
                              >
                                <option value="" disabled>Select a topic…</option>
                                {subjectOptions.map((opt) => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            </FormControl>
                            <FormMessage className="text-xs" />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Message */}
                    <FormField
                      control={form.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-semibold text-dark/70">Your Message *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us how we can help you and your furry mate..."
                              rows={6}
                              {...field}
                              className="rounded-xl border-dark/10 bg-stone-50/60 focus:bg-white transition-colors resize-none"
                              data-testid="textarea-contact-message"
                            />
                          </FormControl>
                          <div className="flex justify-between items-center">
                            <FormMessage className="text-xs" />
                            <p className="text-xs text-dark/30 ml-auto">{field.value.length}/3000</p>
                          </div>
                        </FormItem>
                      )}
                    />

                    <div style={{ height: "1px", backgroundColor: "rgba(0,0,0,0.06)" }} />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                      <p className="text-xs text-dark/40 leading-relaxed">
                        By submitting this form you agree to our{" "}
                        <Link href="/privacy-policy" className="underline hover:text-dark/60">Privacy Policy</Link>.
                      </p>
                      <Button
                        type="submit"
                        disabled={submitting}
                        className="w-full sm:w-auto rounded-full px-10 py-3 text-sm font-semibold gap-2 shadow hover:shadow-md transition-shadow"
                        style={{ backgroundColor: "#4B9073", color: "#FFFFFF", border: "none" }}
                        data-testid="button-contact-submit"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Sending…
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </Form>
              )}
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </main>
  );
}
