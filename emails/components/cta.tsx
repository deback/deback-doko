import { Link } from "@react-email/components";

export default function CTA({ text, href }: { text: string; href: string }) {
	return (
		<Link
			className="text-base text-primary underline"
			href={href}
			target="_blank"
		>
			{text}
		</Link>
	);
}
