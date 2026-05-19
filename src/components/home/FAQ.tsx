import { faqs } from '../../data/dummyData';
import AnimateOnView from '@/src/components/ui/AnimateOnView';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function FAQ() {
  return (
    <section className="py-14 sm:py-24 bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 sm:mb-16">
          <AnimateOnView className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full text-sm text-slate-600 font-medium mb-3">
            Frequently Asked Questions
          </AnimateOnView>
          <AnimateOnView delay={0.1}>
            <h2 className="text-2xl sm:text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-3">
              Got <span className="gradient-text">Questions?</span>
            </h2>
          </AnimateOnView>
          <AnimateOnView delay={0.2}>
            <p className="text-base sm:text-lg text-slate-500">
              Everything you need to know about Storee
            </p>
          </AnimateOnView>
        </div>

        <AnimateOnView delay={0.1}>
          <Accordion defaultValue={['item-0']} className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`item-${i}`}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm px-6 overflow-hidden"
              >
                <AccordionTrigger className="font-semibold text-slate-900 text-left hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-slate-500 text-sm leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </AnimateOnView>
      </div>
    </section>
  );
}
