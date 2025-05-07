"use client";

import React from "react";
import { Card } from "@ui/card";
import { Button } from "@ui/button";
import { useAuth } from "@lib/auth";
import { SubscriptionStatus } from "@/components/SubscriptionStatus";

export default function DashboardPage() {
  const { user, role, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0 mb-6">
        <h1 className="text-2xl font-bold">Welcome back!</h1>
      </div>

      {/* Welcome section */}
      <section className="mb-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Total Lessons</h3>
            <p className="text-3xl font-bold">12</p>
          </Card>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Hours Learned</h3>
            <p className="text-3xl font-bold">24</p>
          </Card>
          <Card className="p-6 bg-white">
            <h3 className="font-semibold mb-2">Next Lesson</h3>
            <p className="text-sm text-gray-500">No upcoming lessons</p>
          </Card>
        </div>
      </section>

      {/* Subscription Status */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Your Subscription</h2>
        <SubscriptionStatus />
      </section>

      {/* User information */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">User Information</h2>
        <Card className="p-6 bg-white">
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <p className="text-sm font-medium text-gray-500">Name</p>
                <p>{user?.name || "Not set"}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p>{user?.email || "Not set"}</p>
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
        <Card className="bg-white divide-y">
          {[1, 2, 3].map((item) => (
            <div key={item} className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-medium">Completed Lesson {item}</h4>
                <p className="text-sm text-gray-500">2 days ago</p>
              </div>
              <Button variant="ghost" size="sm">
                View Details
              </Button>
            </div>
          ))}
        </Card>
      </section>
    </>
  );
} 