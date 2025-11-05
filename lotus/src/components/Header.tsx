"use client";

import Link from "next/link";
import Image from "next/image";
import {Tabs} from "@lemonsqueezy/wedges";
import { Sorts_Mill_Goudy } from 'next/font/google'

const sorts_mill_goudy = Sorts_Mill_Goudy({
    weight: ["400"],
    subsets: ["latin"],
})
export default function Header() {
    return (
        <header className="flex items-center justify-between p-4 border-b border-border ">
            <div className="flex items-center gap-4">
                <Image src="/lotus_icon.png" alt="Logo" width={88} height={88} />
                <span className={`${sorts_mill_goudy.className} text-3xl text-white`}>LOTUS</span>
            </div>
            
            <Tabs variant="fill" defaultValue="home">
                <Tabs.List stretch className="h-14">
                    <Tabs.Trigger asChild value="home">
                        <Link href="/" className="px-5 py-3 text-lg font-medium">
                            Home
                        </Link>
                    </Tabs.Trigger>
                    <Tabs.Trigger asChild value="/play">
                        <Link href="/" className="px-5 py-3 text-lg font-medium">
                            Play
                        </Link>
                    </Tabs.Trigger>
                </Tabs.List>
            </Tabs>

        </header>
    );
}
