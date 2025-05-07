import { Card } from "./components/ui/card";
import { Container } from "./landing-sections/container";
import { MainContentWrapper } from "./landing-sections/main-content-wrapper";
import { SoftwareCompany } from "./landing-sections/software-company";
import { SoftwareCompanyWrapper } from "./landing-sections/software-company-wrapper";
import Image from "next/image";

export default function PageLandingMued(): JSX.Element {
  return (
    <div
      className="flex flex-col w-full min-h-[900px] items-start px-0 sm:px-12 py-0 relative bg-white border-none rounded-none"
    >
      <SoftwareCompany />
      <Container />
      <MainContentWrapper />
      <SoftwareCompanyWrapper />
    </div>
  );
}
