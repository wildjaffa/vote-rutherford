import type { AstroComponent } from "@lucide/astro";
import { LinkTypes, QualificationTypes } from "../constants";
import {
  Users,
  Calendar,
  Layers,
  ArrowRight,
  ArrowLeft,
  User,
  ExternalLink,
  Menu,
  Globe,
  Plus,
  Trash2,
  Newspaper,
  GraduationCap,
  ThumbsUp,
  Briefcase,
  Trophy,
  Vote,
  House,
  LogOut,
  CircleQuestionMark,
  Square,
  SquareCheck,
  Check,
  SquareCheckBig,
  Share,
  GripVertical,
  Mail,
  MessageSquare,
  MapPin,
} from "@lucide/astro";

import {
  Facebook,
  Threads,
  Instagram,
  Youtube,
  Wikipedia,
  X,
  Tiktok,
} from "simple-icons-astro";

// Custom LinkedIn icon matching lucide style
const Linkedin = (() => {
  const LinkedinComponent: AstroComponent = async () => {
    return new Response(
      `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6 z"></path>
        <rect x="2" y="9" width="4" height="12"></rect>
        <circle cx="4" cy="4" r="2"></circle>
      </svg>`,
      { headers: { "Content-Type": "image/svg+xml" } },
    );
  };
  return LinkedinComponent as unknown as AstroComponent;
})();

export {
  Users,
  User,
  Calendar,
  Layers,
  ExternalLink,
  Menu,
  ArrowRight,
  ArrowLeft,
  X,
  Linkedin,
  Globe,
  Plus,
  Trash2,
  Facebook,
  Threads,
  Tiktok,
  Instagram,
  Youtube,
  Wikipedia,
  House,
  LogOut,
  Vote,
  CircleQuestionMark,
  Square,
  SquareCheck,
  Check,
  SquareCheckBig,
  Share,
  GripVertical,
  Mail,
  MessageSquare,
  MapPin,
};

export const qualificationTypeToIcon: Record<string, AstroComponent> = {
  [QualificationTypes.EDUCATION]: GraduationCap,
  [QualificationTypes.WORK_EXPERIENCE]: Briefcase,
  [QualificationTypes.POLITICAL_EXPERIENCE]: Vote,
  [QualificationTypes.ENDORSEMENT]: ThumbsUp,
  [QualificationTypes.AWARD]: Trophy,
  [QualificationTypes.OTHER]: ExternalLink,
};

export const linkTypeToIcon: Record<string, AstroComponent> = {
  [LinkTypes.FACEBOOK]: Facebook as unknown as AstroComponent,
  [LinkTypes.LINKEDIN]: Linkedin,
  [LinkTypes.INSTAGRAM]: Instagram as unknown as AstroComponent,
  [LinkTypes.YOUTUBE]: Youtube as unknown as AstroComponent,
  [LinkTypes.THREADS]: Threads as unknown as AstroComponent,
  [LinkTypes.X]: X as unknown as AstroComponent,
  [LinkTypes.WEBSITE]: Globe,
  [LinkTypes.WIKIPEDIA]: Wikipedia as unknown as AstroComponent,
  [LinkTypes.OTHER]: ExternalLink,
  [LinkTypes.NEWS]: Newspaper,
  [LinkTypes.TIKTOK]: Tiktok as unknown as AstroComponent,
};
