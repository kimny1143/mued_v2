import { FacebookIcon, InstagramIcon, TwitterIcon } from "lucide-react";
import React from "react";
import { Separator } from "../../../../components/ui/separator";

export const SoftwareCompanyWrapper = (): JSX.Element => {
  // Footer navigation data
  const footerColumns = [
    {
      title: "Company",
      links: ["About Us", "Careers", "Press"],
    },
    {
      title: "Resources",
      links: ["Blog", "Help Center", "Contact Support"],
    },
    {
      title: "Legal",
      links: ["Terms of Service", "Privacy Policy"],
    },
    {
      title: "Follow Us",
      links: ["Twitter", "LinkedIn", "Facebook"],
    },
  ];

  return (
    <footer className="flex flex-col items-start gap-6 pt-24 pb-12 px-0 bg-white w-full">
      <Separator className="w-full" />

      <div className="flex items-start gap-12 w-full">
        {/* Logo and social icons column */}
        <div className="flex flex-col items-start justify-between flex-1 self-stretch">
          {/* Logo */}
          <div className="h-8 gap-1 inline-flex items-center">
            <img className="w-7 h-7" alt="Logomark" src="/logomark-1.svg" />
            <div className="[font-family:'Shantell_Sans',Helvetica] font-bold text-[#000000cc] text-[28px] leading-7 whitespace-nowrap">
              MUED
            </div>
          </div>

          {/* Social media icons */}
          <div className="inline-flex items-start gap-3">
            <FacebookIcon className="w-6 h-6 text-gray-600" />
            <InstagramIcon className="w-6 h-6 text-gray-600" />
            <TwitterIcon className="w-6 h-6 text-gray-600" />
          </div>
        </div>

        {/* Footer navigation columns */}
        {footerColumns.map((column, index) => (
          <div
            key={index}
            className="flex flex-col w-[200px] items-start justify-center gap-2"
          >
            <div className="self-stretch mt-[-1.00px] [font-family:'Flow_Circular',Helvetica] font-normal text-[#000000cc] text-[15px] leading-5">
              {column.title}
            </div>

            {column.links.map((link, linkIndex) => (
              <div
                key={linkIndex}
                className="self-stretch [font-family:'Flow_Circular',Helvetica] font-normal text-[#00000066] text-[15px] leading-5 cursor-pointer hover:text-black"
              >
                {link}
              </div>
            ))}
          </div>
        ))}
      </div>
    </footer>
  );
};
