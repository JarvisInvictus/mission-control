import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Invictus Dashboard | Miggy",
};

export default function CoachMcLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
