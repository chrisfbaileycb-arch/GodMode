import React, { useState, useEffect, useRef } from 'react';
import { Button } from 'renderer/components/ui/button';
import {
	Dialog,
	DialogXContent,
	DialogHeader,
	DialogTitle,
} from 'renderer/components/ui/dialog';
import { ProviderInterface } from 'lib/types';
import { CmdOrCtrlKey } from 'lib/utils';
import {
	ReloadIcon,
	ResetIcon,
	ZoomInIcon,
	ZoomOutIcon,
	MagnifyingGlassIcon,
	ExternalLinkIcon,
	ChatBubbleIcon,
	GlobeIcon,
	PaperPlaneIcon,
	CopyIcon,
	CheckIcon,
} from '@radix-ui/react-icons';
import { Input } from 'renderer/components/ui/input';
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from 'renderer/components/ui/tooltip';

interface ChatMessage {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: string;
}

export default function Pane({
	provider,
	number,
	currentlyOpenPreviewPane,
	setOpenPreviewPane,
}: {
	provider: ProviderInterface;
	number: number;
	currentlyOpenPreviewPane: number;
	setOpenPreviewPane: (num: number) => void;
}) {
	const isPreviewOpen = currentlyOpenPreviewPane === number;
	const contentRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const [zoomLevel, setZoomLevel] = useState(0);
	const [viewMode, setViewMode] = useState<'chat' | 'web'>('chat');
	const [inputMessage, setInputMessage] = useState('');
	const [isLoading, setIsLoading] = useState(false);
	const [copiedId, setCopiedId] = useState<string | null>(null);

	// Chat message history for this provider
	const [messages, setMessages] = useState<ChatMessage[]>(() => [
		{
			id: 'welcome',
			role: 'assistant',
			content: `Ready to answer via ${provider.fullName}. Send a Superprompt below to compare responses across models.`,
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
		},
	]);

	// Auto-scroll chat
	useEffect(() => {
		if (viewMode === 'chat') {
			messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
		}
	}, [messages, viewMode]);

	// Execute prompt submission
	const handleSendPrompt = async (promptText: string) => {
		if (!promptText.trim()) return;

		const userMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			role: 'user',
			content: promptText,
			timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
		};

		setMessages((prev) => [...prev, userMsg]);
		setIsLoading(true);

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					providerId: provider.webviewId,
					providerName: provider.fullName,
					prompt: promptText,
				}),
			});

			const data = await res.json();
			const assistantMsg: ChatMessage = {
				id: `assistant-${Date.now()}`,
				role: 'assistant',
				content: data.text || 'No response received.',
				timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			};
			setMessages((prev) => [...prev, assistantMsg]);
		} catch (err: any) {
			const errorMsg: ChatMessage = {
				id: `error-${Date.now()}`,
				role: 'assistant',
				content: `⚠️ Failed to get response: ${err.message || 'Network error'}`,
				timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			};
			setMessages((prev) => [...prev, errorMsg]);
		} finally {
			setIsLoading(false);
		}
	};

	// Listen for global superprompt submissions
	useEffect(() => {
		const handleSuperprompt = (e: any) => {
			if (e.detail?.prompt) {
				handleSendPrompt(e.detail.prompt);
			}
		};

		window.addEventListener('godmode-superprompt-submit', handleSuperprompt);
		return () => {
			window.removeEventListener('godmode-superprompt-submit', handleSuperprompt);
		};
	}, [provider.webviewId]);

	const copyToClipboard = (text: string, id: string) => {
		navigator.clipboard.writeText(text);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 2000);
	};

	const clearChat = () => {
		setMessages([
			{
				id: 'cleared',
				role: 'assistant',
				content: `Chat history cleared. Send a prompt to chat with ${provider.fullName}.`,
				timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
			},
		]);
	};

	function XButton({ children, tooltip, onClick, className = '' }: any) {
		return (
			<TooltipProvider delayDuration={300}>
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={`h-7 px-2 text-xs hover:bg-gray-200 border-gray-300 ${className}`}
							onClick={onClick}
						>
							{children}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom" className="text-white bg-gray-900 text-xs">
						<p>{tooltip}</p>
					</TooltipContent>
				</Tooltip>
			</TooltipProvider>
		);
	}

	const fontSizeStyle = {
		fontSize: `${Math.max(11, 13 + zoomLevel * 2)}px`,
	};

	return (
		<div key={provider.paneId()} className="page darwin group flex flex-col h-full bg-gray-100 border-r border-gray-300 overflow-hidden relative">
			{/* Powerbar button on hover */}
			<div className="hidden powerbar group-hover:block absolute top-2 right-4 z-20">
				<Button
					className="text-xs shadow-md bg-white/90 hover:bg-white text-gray-800 border"
					size="sm"
					onClick={() => setOpenPreviewPane(number)}
					variant="ghost"
				>
					<MagnifyingGlassIcon className="w-3.5 h-3.5 mr-1" />
					{CmdOrCtrlKey}+{number}
				</Button>
			</div>

			{/* Pane Header */}
			<div className="flex items-center justify-between px-3 py-2 bg-gray-200 border-b border-gray-300 text-xs text-gray-700 select-none">
				<div className="flex items-center space-x-1.5 truncate">
					<span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-600 text-white font-bold text-[10px]">
						{number}
					</span>
					<span className="font-semibold text-gray-900 truncate">{provider.shortName}</span>
					<span className="text-[10px] text-gray-500 hidden sm:inline truncate">({provider.fullName})</span>
				</div>

				<div className="flex items-center space-x-1">
					{/* Toggle View Mode */}
					<XButton
						tooltip={viewMode === 'chat' ? 'Switch to Web Embed' : 'Switch to Chat View'}
						onClick={() => setViewMode(viewMode === 'chat' ? 'web' : 'chat')}
					>
						{viewMode === 'chat' ? <GlobeIcon className="w-3.5 h-3.5" /> : <ChatBubbleIcon className="w-3.5 h-3.5" />}
					</XButton>

					{/* Zoom Out */}
					<XButton tooltip="Zoom Out" onClick={() => setZoomLevel((z) => Math.max(-2, z - 1))}>
						<ZoomOutIcon className="w-3.5 h-3.5" />
					</XButton>

					{/* Zoom In */}
					<XButton tooltip="Zoom In" onClick={() => setZoomLevel((z) => Math.min(4, z + 1))}>
						<ZoomInIcon className="w-3.5 h-3.5" />
					</XButton>

					{/* Clear Chat */}
					<XButton tooltip="Clear Chat" onClick={clearChat}>
						<ResetIcon className="w-3.5 h-3.5" />
					</XButton>

					{/* External Web Link */}
					<TooltipProvider delayDuration={300}>
						<Tooltip>
							<TooltipTrigger asChild>
								<a
									href={provider.url}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center justify-center h-7 px-2 text-xs rounded border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition"
								>
									<ExternalLinkIcon className="w-3.5 h-3.5" />
								</a>
							</TooltipTrigger>
							<TooltipContent side="bottom" className="text-white bg-gray-900 text-xs">
								<p>Open official {provider.shortName} website</p>
							</TooltipContent>
						</Tooltip>
					</TooltipProvider>
				</div>
			</div>

			{/* Main Pane Content */}
			{viewMode === 'chat' ? (
				<div className="flex flex-col flex-grow overflow-hidden bg-white">
					{/* Messages scroll area */}
					<div
						className="flex-grow p-3 overflow-y-auto space-y-3"
						style={fontSizeStyle}
					>
						{messages.map((msg) => (
							<div
								key={msg.id}
								className={`flex flex-col ${
									msg.role === 'user' ? 'items-end' : 'items-start'
								}`}
							>
								<div className="flex items-center space-x-1 mb-1 text-[10px] text-gray-400">
									<span>{msg.role === 'user' ? 'You' : provider.shortName}</span>
									<span>•</span>
									<span>{msg.timestamp}</span>
								</div>
								<div
									className={`relative group max-w-[90%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
										msg.role === 'user'
											? 'bg-indigo-600 text-white shadow-sm'
											: 'bg-gray-100 text-gray-800 border border-gray-200 shadow-sm'
									}`}
								>
									<div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>

									{msg.role === 'assistant' && (
										<button
											onClick={() => copyToClipboard(msg.content, msg.id)}
											className="absolute top-1 right-1 p-1 rounded opacity-0 group-hover:opacity-100 bg-white/80 hover:bg-white text-gray-600 shadow-sm transition"
											title="Copy message"
										>
											{copiedId === msg.id ? (
												<CheckIcon className="w-3 h-3 text-green-600" />
											) : (
												<CopyIcon className="w-3 h-3" />
											)}
										</button>
									)}
								</div>
							</div>
						))}

						{isLoading && (
							<div className="flex items-center space-x-2 text-gray-500 p-2 text-xs">
								<div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
								<span>{provider.shortName} is generating response...</span>
							</div>
						)}

						<div ref={messagesEndRef} />
					</div>

					{/* Per-pane Quick Input */}
					<div className="p-2 border-t border-gray-200 bg-gray-50 flex items-center space-x-1">
						<input
							type="text"
							value={inputMessage}
							onChange={(e) => setInputMessage(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									if (inputMessage.trim()) {
										handleSendPrompt(inputMessage);
										setInputMessage('');
									}
								}
							}}
							placeholder={`Message ${provider.shortName}...`}
							className="flex-grow px-2.5 py-1 text-xs border rounded bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
						/>
						<button
							onClick={() => {
								if (inputMessage.trim()) {
									handleSendPrompt(inputMessage);
									setInputMessage('');
								}
							}}
							disabled={isLoading || !inputMessage.trim()}
							className="p-1.5 rounded bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white transition"
							title="Send to this pane"
						>
							<PaperPlaneIcon className="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
			) : (
				/* Web View (Iframe or fallback) */
				<div className="flex flex-col flex-grow relative bg-gray-50">
					<div className="p-2 bg-yellow-50 border-b border-yellow-200 text-xs text-yellow-800 flex items-center justify-between">
						<span>External sites may block embedded iframes via CSP.</span>
						<a
							href={provider.url}
							target="_blank"
							rel="noreferrer"
							className="underline font-semibold ml-2 text-yellow-900"
						>
							Open {provider.shortName} Web App ↗
						</a>
					</div>
					<iframe
						src={provider.url}
						title={provider.fullName}
						className="w-full flex-grow border-0"
						sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
					/>
				</div>
			)}

			{/* Hidden element for backward compatibility with getWebview() ID lookups */}
			<div id={provider.webviewId} className="hidden" data-zoom={zoomLevel} />

			{/* Full Preview Dialog (Cmd+1..N) */}
			<Dialog
				open={isPreviewOpen}
				onOpenChange={() => setOpenPreviewPane(0)}
			>
				<DialogXContent className="bg-white flex flex-col p-4 max-w-4xl" ref={contentRef}>
					<DialogHeader>
						<DialogTitle className="flex items-center justify-between pb-2 border-b">
							<div className="flex items-center space-x-2">
								<span className="font-bold text-gray-900">{provider.fullName}</span>
								<span className="text-xs text-gray-500 px-2 py-0.5 bg-gray-100 rounded">Pane {number}</span>
							</div>

							<div className="flex items-center space-x-2">
								<XButton tooltip="Zoom Out" onClick={() => setZoomLevel((z) => Math.max(-2, z - 1))}>
									<ZoomOutIcon className="w-4 h-4" />
								</XButton>
								<XButton tooltip="Zoom In" onClick={() => setZoomLevel((z) => Math.min(4, z + 1))}>
									<ZoomInIcon className="w-4 h-4" />
								</XButton>
								<XButton tooltip="Reset Zoom" onClick={() => setZoomLevel(0)}>
									<MagnifyingGlassIcon className="w-4 h-4" />
								</XButton>
								<XButton tooltip="Clear Chat" onClick={clearChat}>
									<ResetIcon className="w-4 h-4" />
								</XButton>
								<a
									href={provider.url}
									target="_blank"
									rel="noreferrer"
									className="inline-flex items-center px-2 py-1 text-xs border rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition"
								>
									<ExternalLinkIcon className="w-3.5 h-3.5 mr-1" />
									Open Web App
								</a>
							</div>
						</DialogTitle>
					</DialogHeader>

					{/* Expanded Chat View */}
					<div className="flex-grow flex flex-col overflow-hidden my-2 border rounded-lg bg-gray-50">
						<div className="flex-grow p-4 overflow-y-auto space-y-4" style={fontSizeStyle}>
							{messages.map((msg) => (
								<div
									key={msg.id}
									className={`flex flex-col ${
										msg.role === 'user' ? 'items-end' : 'items-start'
									}`}
								>
									<div className="flex items-center space-x-1 mb-1 text-xs text-gray-400">
										<span className="font-medium text-gray-600">{msg.role === 'user' ? 'You' : provider.fullName}</span>
										<span>•</span>
										<span>{msg.timestamp}</span>
									</div>
									<div
										className={`relative group max-w-[85%] rounded-lg px-4 py-2.5 text-sm leading-relaxed ${
											msg.role === 'user'
												? 'bg-indigo-600 text-white shadow'
												: 'bg-white text-gray-800 border border-gray-200 shadow'
										}`}
									>
										<div className="whitespace-pre-wrap font-sans break-words">{msg.content}</div>
									</div>
								</div>
							))}
							{isLoading && (
								<div className="flex items-center space-x-2 text-gray-500 p-2 text-sm">
									<div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
									<span>Generating response...</span>
								</div>
							)}
						</div>

						{/* Input in modal */}
						<div className="p-3 border-t bg-white flex items-center space-x-2">
							<input
								type="text"
								value={inputMessage}
								onChange={(e) => setInputMessage(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										if (inputMessage.trim()) {
											handleSendPrompt(inputMessage);
											setInputMessage('');
										}
									}
								}}
								placeholder={`Follow up with ${provider.fullName}...`}
								className="flex-grow px-3 py-2 text-sm border rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
							/>
							<Button
								onClick={() => {
									if (inputMessage.trim()) {
										handleSendPrompt(inputMessage);
										setInputMessage('');
									}
								}}
								disabled={isLoading || !inputMessage.trim()}
								className="bg-indigo-600 hover:bg-indigo-700 text-white"
							>
								Send
							</Button>
						</div>
					</div>
				</DialogXContent>
			</Dialog>
		</div>
	);
}
