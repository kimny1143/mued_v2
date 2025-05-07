import React from "react";
import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";

export const MainContentWrapper = (): JSX.Element => {
  const plans = [
    {
      name: "Basic",
      price: "$10",
      period: "month",
      audience: "Individuals",
      buttonText: "Choose Basic",
      buttonVariant: "outline",
      features: [
        "Access to basic features",
        "Email support",
        "1GB storage",
        "Community access",
        "Limited customization",
      ],
      highlighted: false,
    },
    {
      name: "Pro",
      price: "$30",
      period: "month",
      audience: "Teams",
      buttonText: "Start with Plus",
      buttonVariant: "default",
      features: [
        "Access to all features",
        "Priority support",
        "10GB storage",
        "Advanced customization",
        "Analytics & insights",
      ],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "Contact us",
      period: "",
      audience: "Organizations",
      buttonText: "Contact Sales",
      buttonVariant: "outline",
      features: [
        "Custom solutions",
        "Dedicated support",
        "Unlimited storage",
        "Full customization",
        "Enterprise integrations",
      ],
      highlighted: false,
    },
  ];

  return (
    <section className="flex items-start py-12 relative self-stretch w-full flex-[0_0_auto] z-[1]">
      <div className="flex flex-col items-start relative flex-1 grow">
        <div className="flex flex-col items-start gap-12 py-12 relative self-stretch w-full flex-[0_0_auto] bg-white">
          <div className="gap-4 px-4 sm:px-24 py-0 flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
            <h1 className="relative self-stretch mt-[-1.00px] [font-family:'Shantell_Sans',Helvetica] font-medium text-[#000000cc] text-[48px] sm:text-[64px] text-center tracking-[0] leading-[1.1] sm:leading-[68px]">
              Subscription Plans
            </h1>

            <p className="relative self-stretch [font-family:'Flow_Circular',Helvetica] font-normal text-[#000000cc] text-xl sm:text-2xl text-center tracking-[0] leading-8">
              Choose the plan that&#39;s right for you
            </p>
          </div>

          {/* Horizontally scrollable container for plans on mobile */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex sm:grid sm:grid-cols-3 gap-6 min-w-min px-4 sm:px-24">
              {plans.map((plan, index) => (
                <Card
                  key={index}
                  className={`flex-none w-[300px] sm:w-auto flex-col p-6 rounded-lg overflow-hidden border-2 border-solid border-[#000000cc] ${
                    plan.highlighted ? "bg-[#33333314]" : "bg-white"
                  } transition-transform duration-300 hover:scale-105`}
                >
                  <CardContent className="p-0 flex flex-col gap-6">
                    <div className="gap-4 flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                      <div className="relative self-stretch mt-[-1.00px] [font-family:'Flow_Circular',Helvetica] font-normal text-[#000000cc] text-[17px] tracking-[0] leading-6">
                        {plan.name}
                      </div>

                      <div className="flex items-baseline gap-1 relative self-stretch w-full flex-[0_0_auto]">
                        <div className="relative w-fit mt-[-1.00px] font-medium text-5xl tracking-[0] leading-[52px] whitespace-nowrap [font-family:'Shantell_Sans',Helvetica] text-[#000000cc]">
                          {plan.price}
                        </div>

                        {plan.period && (
                          <div className="relative flex-1 [font-family:'Flow_Circular',Helvetica] font-normal text-[#000000cc] text-xl tracking-[0] leading-6">
                            {plan.period}
                          </div>
                        )}
                      </div>

                      <div
                        className={`relative self-stretch [font-family:'Flow_Circular',Helvetica] font-normal ${
                          plan.highlighted ? "text-[#000000cc]" : "text-[#00000066]"
                        } text-[13px] tracking-[0] leading-4`}
                      >
                        {plan.audience}
                      </div>
                    </div>

                    <Button
                      variant={plan.buttonVariant as "outline" | "default"}
                      className={`relative self-stretch w-full h-auto rounded ${
                        plan.buttonVariant === "default"
                          ? "bg-[#000000cc] text-white"
                          : "border-2 border-solid border-[#000000cc]"
                      }`}
                    >
                      <span className="relative w-fit [font-family:'Shantell_Sans',Helvetica] font-medium text-[15px] tracking-[0] leading-5 whitespace-nowrap">
                        {plan.buttonText}
                      </span>
                    </Button>

                    <img
                      className="relative self-stretch w-full h-0.5"
                      alt="Divider"
                      src="/divider.svg"
                    />

                    <div className="flex flex-col items-start gap-1 relative self-stretch w-full flex-[0_0_auto]">
                      {plan.features.map((feature, featureIndex) => (
                        <div
                          key={featureIndex}
                          className="flex items-center gap-2 relative self-stretch w-full flex-[0_0_auto]"
                        >
                          {plan.highlighted ? (
                            <img
                              className="relative w-6 h-6"
                              alt="Check"
                              src="/check-1.svg"
                            />
                          ) : (
                            <img
                              className="relative w-6 h-6"
                              alt="Check"
                              src={index === 0 ? "/check.svg" : "/check-1.svg"}
                            />
                          )}

                          <div
                            className={`relative flex-1 [font-family:'Flow_Circular',Helvetica] font-normal ${
                              plan.highlighted && index === 1
                                ? "text-[#000000cc]"
                                : "text-[#00000066]"
                            } text-[13px] tracking-[0] leading-4`}
                          >
                            {feature}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <img
            className="top-[676px] absolute w-[1536px] h-px -left-24"
            alt="Divider"
            src="/divider.svg"
          />
        </div>
      </div>
    </section>
  );
};