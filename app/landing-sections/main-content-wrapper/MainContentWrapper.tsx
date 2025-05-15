'use client';

import React from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent } from "../../components/ui/card";
import { CheckIcon } from "lucide-react";

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
    <section id="pricing" className="flex items-start py-12 relative self-stretch w-full flex-[0_0_auto] z-[1]">
      <div className="flex flex-col items-start relative flex-1 grow">
        <div className="flex flex-col items-start gap-12 py-12 relative self-stretch w-full flex-[0_0_auto] bg-white">
          <div className="gap-4 px-4 sm:px-24 py-0 flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
            <h1 className="relative self-stretch mt-[-1.00px] font-shantell font-medium text-[#000000cc] text-4xl sm:text-6xl text-center tracking-[0] leading-[1.1] sm:leading-[1.2]">
              Subscription Plans
            </h1>

            <p className="relative self-stretch font-shantell font-medium text-[#000000cc] text-xl sm:text-2xl text-center tracking-[0] leading-8">
              Choose the plan that&#39;s right for you
            </p>
          </div>

          {/* Horizontally scrollable container for plans on mobile */}
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex sm:grid sm:grid-cols-3 gap-6 min-w-min px-4 sm:px-24 py-6">
              {plans.map((plan, index) => (
                <div key={index} className="p-3">
                  <Card
                    className={`flex-none w-[300px] sm:w-auto flex-col p-6 rounded-lg overflow-hidden border-2 border-solid border-[#000000cc] ${
                      plan.highlighted ? "bg-[#33333314]" : "bg-white"
                    } transition-transform duration-300 hover:scale-105`}
                  >
                    <CardContent className="p-0 flex flex-col gap-6">
                      <div className="gap-4 flex flex-col items-start relative self-stretch w-full flex-[0_0_auto]">
                        <div className="relative self-stretch mt-[-1.00px] font-shantell font-medium text-[#000000cc] text-[18px] leading-6">
                          {plan.name}
                        </div>

                        <div className="flex items-baseline gap-1 relative self-stretch w-full flex-[0_0_auto]">
                          <div className="relative w-fit mt-[-1.00px] font-medium text-5xl tracking-[0] leading-[52px] whitespace-nowrap font-shantell text-[#000000cc]">
                            {plan.price}
                          </div>

                          {plan.period && (
                            <div className="relative flex-1 font-shantell font-medium text-[#000000cc] text-[15px] leading-5">
                              {plan.period}
                            </div>
                          )}
                        </div>

                        <div
                          className={`relative self-stretch font-shantell font-medium ${
                            plan.highlighted ? "text-[#000000cc]" : "text-[#00000066]"
                          } text-[15px] leading-5`}
                        >
                          {plan.audience}
                        </div>
                      </div>

                      <Button
                        variant={plan.buttonVariant as "outline" | "default"}
                        className={`relative self-stretch w-full h-auto py-3 rounded text-lg ${
                          plan.buttonVariant === "default"
                            ? "bg-[#000000cc] text-white"
                            : "border-2 border-solid border-[#000000cc]"
                        }`}
                      >
                        <span className="relative w-fit font-shantell font-medium text-lg tracking-[0] leading-6 whitespace-nowrap">
                          {plan.buttonText}
                        </span>
                      </Button>

                      <img
                        className="relative self-stretch w-full h-0.5"
                        alt="Divider"
                        src="/divider.svg"
                      />

                      <div className="flex flex-col items-start gap-3 relative self-stretch w-full flex-[0_0_auto]">
                        {plan.features.map((feature, featureIndex) => (
                          <div
                            key={featureIndex}
                            className="flex items-center gap-3 relative self-stretch w-full flex-[0_0_auto]"
                          >
                            <CheckIcon 
                              className={`w-6 h-6 ${plan.highlighted || (index === 0 && !plan.highlighted) ? 'text-[#000000cc]' : 'text-[#00000099]'}`} 
                            />

                            <div
                              className={`relative flex-1 font-shantell font-medium ${
                                plan.highlighted && index === 1
                                  ? "text-[#000000cc]"
                                  : "text-[#00000066]"
                              } text-[15px] leading-5`}
                            >
                              {feature}
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
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