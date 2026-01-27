export default function CopyCode({ code }: { code: string }) {
	return (
		<code className="inline-block py-2 px-4 break-all text-xs bg-neutral-100 rounded-md border border-solid border-neutral-200 text-neutral-500">
			{code}
		</code>
	);
}
