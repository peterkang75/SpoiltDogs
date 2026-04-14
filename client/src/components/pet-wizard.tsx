import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { usePet } from "@/context/pet-context";
import { Dog, Sparkles, ArrowRight, PawPrint } from "lucide-react";

const BREEDS = [
  "Mixed Breed",
  "Labrador Retriever",
  "Golden Retriever",
  "German Shepherd",
  "Bulldog",
  "Poodle",
  "Beagle",
  "Rottweiler",
  "Dachshund",
  "Corgi",
  "Husky",
  "Border Collie",
  "Boxer",
  "Cavalier King Charles",
  "Cocker Spaniel",
  "French Bulldog",
  "Great Dane",
  "Shih Tzu",
  "Maltese",
  "Australian Shepherd",
  "Kelpie",
  "Staffy",
  "Jack Russell",
  "Other",
];

const AGE_OPTIONS = [
  "Puppy (0-1 year)",
  "Young (1-3 years)",
  "Adult (3-7 years)",
  "Senior (7+ years)",
];

export function PetWizard() {
  const { showWizard, setShowWizard, savePet } = usePet();
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [breed, setBreed] = useState("");
  const [age, setAge] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    savePet({ name: name.trim(), breed, age });
    setStep(0);
    setName("");
    setBreed("");
    setAge("");
  };

  const handleClose = () => {
    setShowWizard(false);
    setStep(0);
    setName("");
    setBreed("");
    setAge("");
  };

  return (
    <Dialog open={showWizard} onOpenChange={handleClose}>
      <DialogContent
        className="sm:max-w-md p-0 overflow-hidden bg-cream"
        style={{ border: "1px solid rgba(0,0,0,0.06)", borderRadius: "16px" }}
        data-testid="dialog-pet-wizard"
      >
        <DialogTitle className="sr-only">Personalise Your Shop</DialogTitle>
        <DialogDescription className="sr-only">Tell us about your dog to get personalised product recommendations</DialogDescription>

        {step === 0 && (
          <div className="flex flex-col items-center text-center px-8 py-10">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sage/10 mb-6">
              <Dog className="h-8 w-8 text-sage" />
            </div>
            <h2 className="font-serif text-2xl font-bold text-dark mb-2" data-testid="text-wizard-title">
              Let's personalise your shop
            </h2>
            <p className="text-muted-foreground text-sm leading-relaxed mb-8 max-w-xs">
              Tell us about your furry mate and we'll tailor product recommendations just for them.
            </p>
            <Button
              className="bg-sage text-cream rounded-full gap-2 px-8"
              onClick={() => setStep(1)}
              data-testid="button-wizard-start"
            >
              Get Started
              <ArrowRight className="h-4 w-4" />
            </Button>
            <button
              className="mt-4 text-xs text-muted-foreground/60 underline-offset-2 hover:underline"
              onClick={handleClose}
              data-testid="button-wizard-skip"
            >
              Maybe later
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <PawPrint className="h-5 w-5 text-sage" />
              <h3 className="font-serif text-xl font-bold text-dark" data-testid="text-wizard-step1">
                What's your dog's name?
              </h3>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="pet-name" className="text-sm font-medium text-dark">Name</Label>
                <Input
                  id="pet-name"
                  placeholder="e.g. Buddy, Luna, Max..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-lg h-11"
                  style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                  autoFocus
                  data-testid="input-pet-name"
                />
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" className="text-muted-foreground" onClick={() => setStep(0)} data-testid="button-wizard-back-1">
                  Back
                </Button>
                <Button
                  className="bg-sage text-cream rounded-full gap-2 px-6"
                  onClick={() => name.trim() && setStep(2)}
                  disabled={!name.trim()}
                  data-testid="button-wizard-next-1"
                >
                  Next
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-8 py-8">
            <div className="flex items-center gap-3 mb-6">
              <PawPrint className="h-5 w-5 text-sage" />
              <h3 className="font-serif text-xl font-bold text-dark" data-testid="text-wizard-step2">
                Tell us about {name}
              </h3>
            </div>
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-dark">Breed</Label>
                <Select value={breed} onValueChange={setBreed}>
                  <SelectTrigger
                    className="rounded-lg h-11"
                    style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                    data-testid="select-pet-breed"
                  >
                    <SelectValue placeholder="Select breed..." />
                  </SelectTrigger>
                  <SelectContent data-testid="select-breed-options">
                    {BREEDS.map((b) => (
                      <SelectItem key={b} value={b} data-testid={`option-breed-${b.toLowerCase().replace(/\s+/g, "-")}`}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-dark">Age</Label>
                <Select value={age} onValueChange={setAge}>
                  <SelectTrigger
                    className="rounded-lg h-11"
                    style={{ border: "1px solid rgba(0,0,0,0.1)" }}
                    data-testid="select-pet-age"
                  >
                    <SelectValue placeholder="Select age range..." />
                  </SelectTrigger>
                  <SelectContent data-testid="select-age-options">
                    {AGE_OPTIONS.map((a) => (
                      <SelectItem key={a} value={a} data-testid={`option-age-${a.toLowerCase().replace(/[^a-z0-9]/g, "-")}`}>
                        {a}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="ghost" className="text-muted-foreground" onClick={() => setStep(1)} data-testid="button-wizard-back-2">
                  Back
                </Button>
                <Button
                  className="bg-sage text-cream rounded-full gap-2 px-6"
                  onClick={handleSave}
                  disabled={!breed || !age}
                  data-testid="button-wizard-save"
                >
                  <Sparkles className="h-4 w-4" />
                  Personalise My Shop
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-center gap-1.5 pb-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-sage" : "w-1.5 bg-sage/20"
              }`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
