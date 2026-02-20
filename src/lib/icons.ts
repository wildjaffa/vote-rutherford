import type { AstroComponent } from "@lucide/astro";
import { Constants } from "../constants";
import {
  User,
  ExternalLink,
  Menu,
  X,
  Linkedin,
  Globe,
  Plus,
  Trash2,
  Newspaper,
} from "@lucide/astro";

import {
  Facebook,
  Threads,
  Instagram,
  Youtube,
  Wikipedia,
} from "simple-icons-astro";

export { User, ExternalLink, Menu, X, Linkedin, Globe, Plus, Trash2 };
export { Facebook, Threads, Instagram, Youtube, Wikipedia };

export const linkTypeToIcon: Record<string, AstroComponent> = {
  [Constants.FACEBOOK_LINK_TYPE]: Facebook,
  [Constants.LINKEDIN_LINK_TYPE]: Linkedin,
  [Constants.INSTAGRAM_LINK_TYPE]: Instagram,
  [Constants.YOUTUBE_LINK_TYPE]: Youtube,
  [Constants.THREADS_LINK_TYPE]: Threads,
  [Constants.X_LINK_TYPE]: X,
  [Constants.WEBSITE_LINK_TYPE]: Globe,
  [Constants.WIKIPEDIA_LINK_TYPE]: Wikipedia,
  [Constants.OTHER_LINK_TYPE]: ExternalLink,
  [Constants.NEWS_LINK_TYPE]: Newspaper,
};
