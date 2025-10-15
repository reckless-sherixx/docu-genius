import Register from "@/components/features/auth/Register";
import Image from "next/image";
import Graphics from "@/public/InformationGraphics.png"

export default function page() {
    return (
        <div className="min-h-screen w-full bg-white flex">
            <div className="hidden lg:flex h-screen sticky top-0 p-12">
                <div className="relative min-w-lg  rounded-3xl ml-20">
                    <Image
                        src={Graphics}
                        alt="DocuGenius Graphics"
                        fill
                        className="object-fill"
                        priority
                    />
                </div>
            </div>

            <div className="w-full  flex items-center justify-center">
                <Register />
            </div>
        </div>
    )
}
