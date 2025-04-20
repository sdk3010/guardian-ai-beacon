
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { MapPin, Plus } from "lucide-react";

export default function FloatingTrackButton() {
  const navigate = useNavigate();

  return (
    <Button
      className="fixed bottom-6 right-6 rounded-full w-14 h-14 p-0 shadow-lg"
      onClick={() => navigate('/dashboard/tracking')}
    >
      <MapPin className="w-6 h-6" />
    </Button>
  );
}
