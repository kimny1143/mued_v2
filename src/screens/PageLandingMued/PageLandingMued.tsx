import React from "react";
import { Card } from "../../components/ui/card";
import { ContainerByAnima } from "./sections/ContainerByAnima";
import { MainContentWrapperByAnima } from "./sections/MainContentWrapperByAnima";
import { SoftwareCompanyByAnima } from "./sections/SoftwareCompanyByAnima";
import { SoftwareCompanyWrapperByAnima } from "./sections/SoftwareCompanyWrapperByAnima/SoftwareCompanyWrapperByAnima";

export const PageLandingMued = (): JSX.Element => {
  return (
    <Card
      className="flex flex-col w-full min-h-[900px] items-start px-12 py-0 relative bg-white border-2 border-solid border-black rounded-none"
      data-model-id="4:125"
    >
      <SoftwareCompanyByAnima />
      <ContainerByAnima />
      <MainContentWrapperByAnima />
      <SoftwareCompanyWrapperByAnima />
    </Card>
  );
};
