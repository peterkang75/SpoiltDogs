import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Where are SpoiltDogs products made?",
    answer: "All SpoiltDogs products are proudly made right here in Australia. We source our ingredients locally wherever possible, supporting Australian farmers and suppliers. Our manufacturing facility is based in regional Victoria.",
  },
  {
    question: "Do you offer free shipping?",
    answer: "Yes! We offer free standard shipping Australia-wide on all orders over $99 AUD. Orders under $99 attract a flat-rate shipping fee of $9.95. Express shipping is available for an additional fee.",
  },
  {
    question: "Are your products suitable for dogs with allergies?",
    answer: "Many of our products are formulated with sensitive dogs in mind. Our food range is grain-free and uses limited, all-natural ingredients. We always recommend consulting your vet before making dietary changes.",
  },
  {
    question: "What is your returns policy?",
    answer: "We offer a 30-day satisfaction guarantee on all products. If your dog isn't absolutely loving their SpoiltDogs purchase, contact us for a hassle-free return or exchange. Opened food products can be returned within 14 days.",
  },
  {
    question: "How long does delivery take?",
    answer: "Standard delivery takes 3-5 business days to metro areas and 5-8 business days to regional areas across Australia. Express delivery (1-2 business days to metro) is available at checkout.",
  },
  {
    question: "Are your packaging materials eco-friendly?",
    answer: "Absolutely. We use 100% recyclable and compostable packaging. Our shipping boxes are made from recycled cardboard, and we've eliminated all single-use plastics from our supply chain.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-cream py-16 sm:py-24" data-testid="section-faq">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-faq-eyebrow">
            Got Questions?
          </p>
          <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl" data-testid="text-faq-title">
            Frequently asked <span className="text-sage">questions</span>
          </h2>
        </div>

        <Accordion type="single" collapsible className="space-y-3" data-testid="accordion-faq">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border-none bg-card px-6 shadow-sm data-[state=open]:bg-sage-light/30"
              data-testid={`faq-item-${i}`}
            >
              <AccordionTrigger className="text-left font-serif font-semibold text-dark hover:no-underline py-4">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
