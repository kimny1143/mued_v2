import { Card } from "@ui/card";
import { Container } from "@/landing-sections/container";
import { MainContentWrapper } from "@/landing-sections/main-content-wrapper";
import { SoftwareCompany } from "@/landing-sections/software-company";
import { SoftwareCompanyWrapper } from "@/landing-sections/software-company-wrapper";

export default function PageLandingMued(): JSX.Element {
  return (
    <Card
      className="flex flex-col w-full min-h-[900px] items-start px-12 py-0 relative bg-white border-2 border-solid border-black rounded-none"
      data-model-id="4:125"
    >
      <SoftwareCompany />
      <Container />
      <MainContentWrapper />
      <SoftwareCompanyWrapper />
    </Card>
  );
}
