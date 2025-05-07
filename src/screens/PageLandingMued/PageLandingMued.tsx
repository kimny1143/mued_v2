import React from "react";
import { Card } from "../../components/ui/card";
import { Container } from "./sections/Container";
import { MainContentWrapper } from "./sections/MainContentWrapper";
import { SoftwareCompany } from "./sections/SoftwareCompany";
import { SoftwareCompanyWrapper } from "./sections/SoftwareCompanyWrapper/SoftwareCompanyWrapper";

export const PageLandingMued = (): JSX.Element => {
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
};
