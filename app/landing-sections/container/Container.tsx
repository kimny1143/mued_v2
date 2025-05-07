import { ChevronDownIcon, ChevronRightIcon, ImageIcon } from "lucide-react";
import React from "react";
import { Button } from "@ui/button";
import { Card, CardContent } from "@ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@ui/pagination";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/select";

export const Container = (): JSX.Element => {
  return (
    <section className="flex items-start px-4 sm:px-0 py-12 relative self-stretch w-full flex-[0_0_auto] z-[2]">
      <div className="flex flex-col items-start relative flex-1 grow">
        {/* Hero Section */}
        <div className="relative self-stretch w-full z-[3] bg-white overflow-hidden">
          <div className="flex flex-col w-full items-center gap-16 sm:gap-32 pt-12 sm:pt-24 pb-0 px-4 sm:px-24 [background:linear-gradient(176deg,rgba(255,255,255,0.7)_14%,rgba(51,51,51,0.06)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
            <div className="flex flex-col items-center gap-12 sm:gap-24 relative self-stretch w-full flex-[0_0_auto]">
              <h1 className="relative self-stretch mt-[-1.00px] [font-family:'Shantell_Sans',Helvetica] font-medium text-[#000000cc] text-4xl sm:text-[120px] text-center tracking-[0] leading-tight sm:leading-[120px]">
                Learn Anytime, Anywhere with MUED
              </h1>

              <Button className="px-6 py-3 bg-[#000000cc] rounded w-full sm:w-auto">
                <span className="[font-family:'Shantell_Sans',Helvetica] font-medium text-white text-xl leading-6">
                  Get Started
                </span>
              </Button>
            </div>

            <div className="relative self-stretch w-full h-[400px] sm:h-[865px] overflow-hidden">
              <div className="relative w-[90%] max-w-[513px] h-[975px] mx-auto bg-white rounded-[44px] overflow-hidden border-2 border-solid border-[#000000cc]">
                <div className="absolute w-[70%] h-[42px] top-[378px] left-[15%] bg-[#00000033] rounded opacity-50" />
                <div className="absolute w-[60%] h-[42px] top-[444px] left-[20%] bg-[#00000033] rounded opacity-50" />

                <Button className="flex w-[85%] items-center justify-center gap-2 px-8 py-4 absolute top-[843px] left-[7.5%] bg-[#000000cc] rounded">
                  <span className="[font-family:'Shantell_Sans',Helvetica] font-medium text-white text-xl leading-6">
                    Join Now
                  </span>
                </Button>

                <div className="h-[72px] gap-[9px] absolute top-[229px] left-[50%] transform -translate-x-1/2 inline-flex items-center">
                  <img
                    className="relative w-[63px] h-[63px]"
                    alt="Logomark"
                    src="/logomark.svg"
                  />
                  <div className="relative w-fit [font-family:'Shantell_Sans',Helvetica] font-bold text-[#000000cc] text-[63px] tracking-[0] leading-[63px] whitespace-nowrap">
                    MUED
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Section */}
        <section className="flex flex-col items-start justify-center gap-12 px-4 sm:px-0 py-12 relative self-stretch w-full flex-[0_0_auto] z-[2] bg-white">
          <h2 className="relative self-stretch mt-[-2.00px] [font-family:'Shantell_Sans',Helvetica] font-medium text-[#000000cc] text-3xl sm:text-5xl text-center tracking-[0] leading-tight sm:leading-[52px]">
            Why Choose MUED?
          </h2>

          <div className="flex flex-col items-start gap-6 relative self-stretch w-full flex-[0_0_auto]">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative self-stretch w-full">
              {/* Feature cards */}
              <Card className="flex flex-col h-[480px] items-end pt-8 pb-0 px-0 relative rounded-lg overflow-hidden border-2 border-solid border-[#000000cc] [background:linear-gradient(0deg,rgba(0,0,0,0.03)_0%,rgba(0,0,0,0.03)_100%),linear-gradient(0deg,rgba(255,255,255,1)_0%,rgba(255,255,255,1)_100%)]">
                {/* Card content */}
              </Card>
              {/* Repeat for other feature cards */}
            </div>
          </div>
        </section>

        {/* Plans Section */}
        <section className="flex flex-col items-start pt-0 pb-12 px-4 sm:px-0 relative self-stretch w-full flex-[0_0_auto] z-[1] bg-white">
          <div className="flex flex-col items-start justify-center gap-6 px-0 py-6 relative self-stretch w-full flex-[0_0_auto] z-[2] bg-white">
            <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 relative self-stretch w-full flex-[0_0_auto] bg-transparent">
              <div className="flex flex-wrap items-start gap-3 relative flex-[0_0_auto]">
                <Select>
                  <SelectTrigger className="inline-flex items-center justify-center gap-2 pl-4 pr-3 py-2 relative flex-[0_0_auto] bg-white rounded border-2 border-solid border-[#000000cc]">
                    <SelectValue placeholder="Category" />
                    <ChevronDownIcon className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="programming">Programming</SelectItem>
                      <SelectItem value="design">Design</SelectItem>
                      <SelectItem value="business">Business</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>

                <Select>
                  <SelectTrigger className="inline-flex items-center justify-center gap-2 pl-4 pr-3 py-2 relative flex-[0_0_auto] bg-white rounded border-2 border-solid border-[#000000cc]">
                    <SelectValue placeholder="Level" />
                    <ChevronDownIcon className="w-4 h-4" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectItem value="all">All Levels</SelectItem>
                      <SelectItem value="beginner">Beginner</SelectItem>
                      <SelectItem value="intermediate">Intermediate</SelectItem>
                      <SelectItem value="advanced">Advanced</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>

              <div className="relative w-fit [font-family:'Flow_Circular',Helvetica] font-normal text-[#00000066] text-[15px] text-right tracking-[0] leading-5 whitespace-nowrap">
                9 items
              </div>
            </header>
          </div>

          <div className="flex flex-col items-start gap-12 relative self-stretch w-full flex-[0_0_auto] z-[1]">
            {/* Plans Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 relative self-stretch w-full">
              {/* Plan cards */}
            </div>
          </div>

          {/* Pagination */}
          <Pagination className="flex items-start justify-center sm:justify-end pt-16 pb-0 px-0 relative self-stretch w-full flex-[0_0_auto] z-0">
            <PaginationContent className="flex-wrap justify-center">
              {/* Pagination content */}
            </PaginationContent>
          </Pagination>
        </section>

        {/* CTA Section */}
        <section className="flex flex-col items-start gap-2 px-4 sm:px-0 py-6 relative self-stretch w-full flex-[0_0_auto] z-0 bg-white">
          <div className="relative self-stretch w-full h-[400px] sm:h-[625px] border-[#000000cc] bg-[#eeeeee] rounded-lg overflow-hidden border-2 border-solid">
            <div className="relative w-full h-full">
              <div className="absolute w-full h-full top-0 left-0 bg-[#00000080] opacity-20" />
              <div className="flex flex-col w-full max-w-[900px] mx-auto items-center gap-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 sm:px-0">
                <h2 className="relative self-stretch mt-[-1.00px] [font-family:'Shantell_Sans',Helvetica] font-normal text-[#000000cc] text-3xl sm:text-5xl text-center tracking-[0] leading-tight sm:leading-[52px]">
                  Ready to Start Your Learning Journey?
                </h2>
                <Button
                  variant="outline"
                  className="px-6 py-3 bg-white rounded border-2 border-solid border-[#000000cc] w-full sm:w-auto"
                >
                  <span className="[font-family:'Shantell_Sans',Helvetica] font-medium text-[#000000cc] text-xl tracking-[0] leading-6 whitespace-nowrap">
                    今すぐはじめる
                  </span>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
};