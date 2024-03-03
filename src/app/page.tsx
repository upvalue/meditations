import { Button } from "@mantine/core";
import Image from "next/image";
import { TEditor } from "./editor/TEditor";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between p-24">
      <TEditor />
    </main>
  );
}
