import Image from "next/image";
import NotFound from "@/public/404_page.svg"


export default function notFound() {
    return (
        <div className="w-full h-screen flex justify-center items-center">
            <Image src={NotFound} width={600} height={600} alt="img" />
        </div>
    )
}

