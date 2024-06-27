import React from "react";

interface HomeLayoutProps {
  children: React.ReactNode;
}

function HomeLayout({ children }: HomeLayoutProps) {
  return <div className="w-screen h-screen">{children}</div>;
}

export default HomeLayout;
