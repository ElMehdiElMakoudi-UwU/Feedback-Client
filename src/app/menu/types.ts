import type { MenuOptionGroupView } from "@/lib/menu-options";

export type MenuItemView = {
  id: string;
  nameAr: string;
  nameFr: string;
  descriptionAr: string | null;
  descriptionFr: string | null;
  noteAr: string | null;
  noteFr: string | null;
  price: number | null;
  priceLarge: number | null;
  comingSoon: boolean;
  photoUrl: string | null;
  optionGroups: MenuOptionGroupView[];
};

export type MenuCategoryView = {
  id: string;
  nameAr: string;
  nameFr: string;
  items: MenuItemView[];
};

export type MenuSectionView = {
  id: string;
  nameAr: string;
  nameFr: string;
  categories: MenuCategoryView[];
};
