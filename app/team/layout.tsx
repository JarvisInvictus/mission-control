import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invictus Team Hub",
  description: "Invictus Physiques — Team meeting hub",
};

export default function TeamLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
