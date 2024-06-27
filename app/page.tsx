import Link from "next/link";
import React from "react";

import { Button } from "@/components/ui/button";

function MainPage() {
  return (
    <div className="w-screen h-screen px-[4rem] bg-gray-500 flex flex-col items-center">
      <div className="w-full h-full flex flex-col max-w-[calc(1366px_-_4rem)] items-center pt-2">
        <div className="w-full h-[80px] flex items-center border border-transparent justify-between gap-4 rounded-lg px-4 bg-foreground">
          <p className="text-white">Logo</p>
          <div className="flex items-center gap-2">
            <Link href="/auth/signin">
              <Button>Sign in</Button>
            </Link>
            <Link href="/auth/signup">
              <Button>Sign up</Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MainPage;
