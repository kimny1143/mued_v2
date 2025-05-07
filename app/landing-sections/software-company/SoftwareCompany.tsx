'use client';

import { ChevronDownIcon } from "lucide-react";
import React from "react";
import { Button } from "../../components/ui/button";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "../../components/ui/navigation-menu";
import { Separator } from "../../components/ui/separator";
import Link from "next/link";
import Image from "next/image";
import LogoImage from '../../../public/logo.png';
import { useRouter } from "next/navigation";

export const SoftwareCompany = (): JSX.Element => {
  const router = useRouter();
  
  const navItems = [
    { label: "Home" },
    { label: "Features" },
    { label: "Pricing" },
    { label: "Contact" },
  ];

  return (
    <header className="flex items-center justify-between py-4 px-4 sm:px-6 relative w-full bg-white">
      <div className="max-w-[1440px] w-full mx-auto flex flex-col sm:flex-row items-center gap-4 sm:gap-8">
        {/* Left section: Logo and navigation */}
        <div className="flex items-center gap-4 sm:gap-12 w-full sm:w-auto justify-between sm:justify-start">
          {/* Logo */}
          <Link href="/" className="flex h-8 items-center gap-1">
            <Image 
              className="w-12 h-12 object-contain" 
              alt="MUED Logo" 
              src={LogoImage}
              width={48}
              height={48}
              priority
            />
            <div className="font-shantell font-bold text-[#000000cc] text-[28px] leading-7">
              MUED
            </div>
          </Link>

          {/* Mobile menu button */}
          <Button variant="ghost" className="sm:hidden">
            <ChevronDownIcon className="h-6 w-6" />
          </Button>
        </div>

        {/* Navigation menu - hidden on mobile */}
        <div className="hidden sm:flex items-center justify-between flex-1">
          <NavigationMenu>
            <NavigationMenuList className="flex items-start gap-8">
              {navItems.map((item, index) => (
                <NavigationMenuItem key={index}>
                  <NavigationMenuTrigger className="flex items-center gap-1 px-0 py-0 h-auto bg-transparent font-shantell font-medium text-[#000000cc] text-[15px] leading-5">
                    {item.label}
                    <ChevronDownIcon className="w-4 h-4" />
                  </NavigationMenuTrigger>
                </NavigationMenuItem>
              ))}
            </NavigationMenuList>
          </NavigationMenu>

          {/* Right section: Download, Login, Sign Up */}
          <div className="flex items-center gap-4 sm:gap-8">
            <div className="hidden sm:block font-shantell font-medium text-[#000000cc] text-[15px] leading-5">
              Download app
            </div>

            <Separator orientation="vertical" className="hidden sm:block h-8" />

            <Button
              variant="ghost"
              className="font-shantell font-medium text-[#000000cc] text-[15px] leading-5"
              onClick={() => router.push('/login')}
            >
              Log in
            </Button>

            <Button 
              className="px-4 py-2 bg-[#000000cc] rounded font-shantell font-medium text-white text-[15px] leading-5"
              onClick={() => router.push('/register')}
            >
              Sign Up
            </Button>
          </div>
        </div>
      </div>

      {/* Bottom divider */}
      <div className="absolute w-full h-px bottom-0 left-0">
        <img className="w-full h-px" alt="Divider" src="/divider.svg" />
      </div>
    </header>
  );
};