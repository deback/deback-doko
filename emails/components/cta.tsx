import { Link } from "@react-email/components";

export default function CTA({ text, href }: { text: string; href: string }) {
	return (
		<Link
			className="text-primary underline text-base"
			href={href}
			target="_blank"
		>
			{text}
		</Link>
	);
}
