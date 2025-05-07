import { Button } from "@ui/button";
import { Card } from "@ui/card";
import { FileIcon } from "lucide-react";
import { DashboardLayout } from "@/components/DashboardLayout";

export function MaterialsPage() {
  const materials = [
    {
      title: "Music Theory Basics",
      type: "PDF",
      size: "2.4 MB",
      lastUpdated: "2024-04-30",
      image: "https://images.pexels.com/photos/5561923/pexels-photo-5561923.jpeg"
    },
    {
      title: "Piano Practice Sheets",
      type: "PDF",
      size: "1.8 MB",
      lastUpdated: "2024-04-29",
      image: "https://images.pexels.com/photos/4088801/pexels-photo-4088801.jpeg"
    },
    {
      title: "Rhythm Exercises",
      type: "PDF",
      size: "3.2 MB",
      lastUpdated: "2024-04-28",
      image: "https://images.pexels.com/photos/4088009/pexels-photo-4088009.jpeg"
    }
  ];

  return (
    <DashboardLayout 
      title="Materials"
      actions={
        <Button className="bg-black text-white w-full sm:w-auto">
          Upload Material
        </Button>
      }
    >
      {/* Materials Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {materials.map((material, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="aspect-video w-full overflow-hidden">
              <img 
                src={material.image} 
                alt={material.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-4">
              <h3 className="font-semibold mb-2">{material.title}</h3>
              <div className="flex items-center justify-between text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <FileIcon className="w-4 h-4" />
                  <span>{material.type}</span>
                  <span>•</span>
                  <span>{material.size}</span>
                </div>
                <Button variant="ghost" size="sm">
                  Download
                </Button>
              </div>
              <div className="text-xs text-gray-400 mt-2">
                Last updated: {material.lastUpdated}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}