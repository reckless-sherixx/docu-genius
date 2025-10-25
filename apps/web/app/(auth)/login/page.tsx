import Login from "@/components/features/auth/Login";
import Graphics from "@/public/InformationGraphics.png"
import { getServerSession } from "next-auth";
import Image from "next/image";
import { redirect } from "next/navigation";

export default async function loginPage() {
    const session = await getServerSession();
    if(session){
        redirect("/dashboard");
    }
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
                <Login />
            </div>
        </div>
    )
}
