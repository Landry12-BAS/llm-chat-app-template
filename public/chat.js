// === DOM refs (must be first — referenced by functions called during init) ===
const chatMessages = document.getElementById("chat-messages");
const typingWrapper = document.getElementById("typing-wrapper");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const scrollBottomBtn = document.getElementById("scroll-bottom-btn");

// === Theme ===
const html = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const hljsTheme = document.getElementById("hljs-theme");

function setTheme(theme) {
	html.setAttribute("data-theme", theme);
	themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
	hljsTheme.href =
		theme === "dark"
			? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css"
			: "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css";
	localStorage.setItem("cf-theme", theme);
}

setTheme(localStorage.getItem("cf-theme") || "dark");
themeToggle.addEventListener("click", () =>
	setTheme(html.getAttribute("data-theme") === "dark" ? "light" : "dark"),
);

// === Sidebar ===
const sidebar = document.querySelector(".sidebar");
const sidebarOverlay = document.querySelector(".sidebar-overlay");
const sidebarToggle = document.getElementById("sidebar-toggle");

sidebarToggle.addEventListener("click", () => {
	sidebar.classList.toggle("open");
	sidebarOverlay.classList.toggle("visible");
});
sidebarOverlay.addEventListener("click", () => {
	sidebar.classList.remove("open");
	sidebarOverlay.classList.remove("visible");
});

// === Conversations ===
let conversations = JSON.parse(
	localStorage.getItem("cf-conversations") || "[]",
);
let currentConvId = null;
let chatHistory = [];

function saveConversations() {
	localStorage.setItem("cf-conversations", JSON.stringify(conversations));
}

function generateId() {
	return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const GREETING =
	"Hello! I'm powered by Cloudflare Workers AI (Llama 3.1 8B). How can I help you today?";

function createNewConversation() {
	const id = generateId();
	const conv = {
		id,
		title: "New Chat",
		messages: [{ role: "assistant", content: GREETING }],
		createdAt: Date.now(),
	};
	conversations.unshift(conv);
	saveConversations();
	loadConversation(id);
	renderConversationList();
}

function loadConversation(id) {
	currentConvId = id;
	const conv = conversations.find((c) => c.id === id);
	if (!conv) return;
	chatHistory = [...conv.messages];
	document.getElementById("main-title").textContent = conv.title;
	renderAllMessages();
	renderConversationList();
}

function deleteConversation(id) {
	conversations = conversations.filter((c) => c.id !== id);
	saveConversations();
	if (currentConvId === id) {
		conversations.length > 0
			? loadConversation(conversations[0].id)
			: createNewConversation();
	}
	renderConversationList();
}

function renderConversationList() {
	const list = document.getElementById("conversations-list");
	list.innerHTML = "";
	conversations.forEach((conv) => {
		const item = document.createElement("div");
		item.className =
			"conversation-item" + (conv.id === currentConvId ? " active" : "");
		item.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;opacity:0.5">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="conv-title">${escapeHtml(conv.title)}</span>
      <button class="conv-delete" title="Delete">×</button>
    `;
		item.addEventListener("click", (e) => {
			if (e.target.classList.contains("conv-delete")) return;
			loadConversation(conv.id);
			sidebar.classList.remove("open");
			sidebarOverlay.classList.remove("visible");
		});
		item.querySelector(".conv-delete").addEventListener("click", (e) => {
			e.stopPropagation();
			deleteConversation(conv.id);
		});
		list.appendChild(item);
	});
}

document
	.getElementById("new-chat-btn")
	.addEventListener("click", createNewConversation);

document.getElementById("clear-btn").addEventListener("click", () => {
	const conv = conversations.find((c) => c.id === currentConvId);
	if (!conv) return;
	conv.messages = [{ role: "assistant", content: GREETING }];
	conv.title = "New Chat";
	chatHistory = [...conv.messages];
	document.getElementById("main-title").textContent = "New Chat";
	saveConversations();
	renderAllMessages();
	renderConversationList();
});

// Init
if (conversations.length === 0) {
	createNewConversation();
} else {
	loadConversation(conversations[0].id);
}

// === marked.js config ===
marked.setOptions({ breaks: true, gfm: true });

// === Helpers ===
function escapeHtml(str) {
	return String(str)
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatTime(ts) {
	return new Date(ts || Date.now()).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

function renderMarkdown(content) {
	let result = marked.parse(content);
	// Wrap code blocks with header + copy button
	result = result.replace(
		/<pre><code(.*?)>([\s\S]*?)<\/code><\/pre>/g,
		(_, attrs, code) => {
			const langMatch = attrs.match(/class="language-(\w+)"/);
			const lang = langMatch ? langMatch[1] : "text";
			return `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-lang">${lang}</span>
          <button class="copy-btn" onclick="copyCode(this)">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
            Copy
          </button>
        </div>
        <pre><code${attrs}>${code}</code></pre>
      </div>`;
		},
	);
	return result;
}

function highlightCode(el) {
	el.querySelectorAll("pre code").forEach((block) => {
		hljs.highlightElement(block);
	});
}

function createMessageEl(msg, ts) {
	const wrapper = document.createElement("div");
	wrapper.className = `message-wrapper ${msg.role}`;

	const avatar = document.createElement("div");
	avatar.className = `avatar ${msg.role}-avatar`;
	avatar.textContent = msg.role === "user" ? "U" : "⚡";

	const content = document.createElement("div");
	content.className = "message-content";

	const bubble = document.createElement("div");
	bubble.className = "message-bubble";

	if (msg.role === "user") {
		bubble.innerHTML = `<p style="white-space:pre-wrap;margin:0">${escapeHtml(msg.content)}</p>`;
	} else {
		bubble.innerHTML = renderMarkdown(msg.content);
		highlightCode(bubble);
	}

	const meta = document.createElement("div");
	meta.className = "message-meta";
	meta.textContent = formatTime(ts);

	content.appendChild(bubble);
	content.appendChild(meta);
	wrapper.appendChild(avatar);
	wrapper.appendChild(content);
	return wrapper;
}

// === Render all messages ===
function renderAllMessages() {
	chatMessages.innerHTML = "";

	if (chatHistory.length === 0) return;

	// Show empty state only if sole message is the greeting and no user msgs
	const hasUserMsg = chatHistory.some((m) => m.role === "user");
	if (!hasUserMsg) {
		const empty = document.createElement("div");
		empty.className = "empty-state";
		empty.innerHTML = `
      <div class="empty-icon">⚡</div>
      <h2>Cloudflare AI Chat</h2>
      <p>Powered by Llama 3.1 8B via Cloudflare Workers AI. Ask me anything.</p>
      <div class="chips">
        <div class="chip">Explain quantum computing</div>
        <div class="chip">Write a Python script</div>
        <div class="chip">What is edge computing?</div>
        <div class="chip">Help me debug my code</div>
      </div>
    `;
		empty.querySelectorAll(".chip").forEach((chip) => {
			chip.addEventListener("click", () => {
				userInput.value = chip.textContent;
				userInput.focus();
			});
		});
		chatMessages.appendChild(empty);
		return;
	}

	chatHistory.forEach((msg) => {
		if (msg.role === "system") return;
		chatMessages.appendChild(createMessageEl(msg));
	});
	chatMessages.scrollTop = chatMessages.scrollHeight;
}

// === Copy code ===
window.copyCode = function (btn) {
	const code = btn.closest(".code-block-wrapper").querySelector("code").textContent;
	navigator.clipboard.writeText(code).then(() => {
		btn.innerHTML = `
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
        <polyline points="20 6 9 17 4 12"/>
      </svg>
      Copied!`;
		btn.classList.add("copied");
		setTimeout(() => {
			btn.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="9" y="9" width="13" height="13" rx="2"/>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
        </svg>
        Copy`;
			btn.classList.remove("copied");
		}, 2000);
	});
};

// === Scroll to bottom button ===
chatMessages.addEventListener("scroll", () => {
	const nearBottom =
		chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight < 120;
	scrollBottomBtn.classList.toggle("visible", !nearBottom);
});
scrollBottomBtn.addEventListener("click", () => {
	chatMessages.scrollTop = chatMessages.scrollHeight;
});

// === Input ===
let isProcessing = false;

userInput.addEventListener("input", function () {
	this.style.height = "auto";
	this.style.height = Math.min(this.scrollHeight, 180) + "px";
});

userInput.addEventListener("keydown", (e) => {
	if (e.key === "Enter" && !e.shiftKey) {
		e.preventDefault();
		sendMessage();
	}
});
sendButton.addEventListener("click", sendMessage);

// === Send message ===
async function sendMessage() {
	const message = userInput.value.trim();
	if (!message || isProcessing) return;

	isProcessing = true;
	sendButton.disabled = true;
	userInput.disabled = true;
	userInput.value = "";
	userInput.style.height = "auto";

	// Add user msg to history + DOM
	chatHistory.push({ role: "user", content: message });

	// Remove empty state if present
	const emptyState = chatMessages.querySelector(".empty-state");
	if (emptyState) emptyState.remove();

	chatMessages.appendChild(createMessageEl({ role: "user", content: message }));
	chatMessages.scrollTop = chatMessages.scrollHeight;

	// Auto-title from first user message
	const conv = conversations.find((c) => c.id === currentConvId);
	if (conv && conv.title === "New Chat") {
		conv.title = message.length > 42 ? message.slice(0, 42) + "…" : message;
		document.getElementById("main-title").textContent = conv.title;
		renderConversationList();
	}

	// Show typing dots
	typingWrapper.classList.add("visible");
	chatMessages.scrollTop = chatMessages.scrollHeight;

	try {
		const response = await fetch("/api/chat", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ messages: chatHistory }),
		});

		if (!response.ok) throw new Error("API error " + response.status);
		if (!response.body) throw new Error("No response body");

		// Build assistant bubble (streaming)
		const wrapper = document.createElement("div");
		wrapper.className = "message-wrapper assistant";
		const avatar = document.createElement("div");
		avatar.className = "avatar assistant-avatar";
		avatar.textContent = "⚡";
		const content = document.createElement("div");
		content.className = "message-content";
		const bubble = document.createElement("div");
		bubble.className = "message-bubble";
		bubble.innerHTML = '<span class="stream-cursor"></span>';
		const meta = document.createElement("div");
		meta.className = "message-meta";
		meta.textContent = formatTime();
		content.appendChild(bubble);
		content.appendChild(meta);
		wrapper.appendChild(avatar);
		wrapper.appendChild(content);

		typingWrapper.classList.remove("visible");
		chatMessages.appendChild(wrapper);
		chatMessages.scrollTop = chatMessages.scrollHeight;

		// Stream SSE
		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let responseText = "";
		let buffer = "";
		let sawDone = false;

		const flush = () => {
			bubble.innerHTML =
				renderMarkdown(responseText) + '<span class="stream-cursor"></span>';
			highlightCode(bubble);
			chatMessages.scrollTop = chatMessages.scrollHeight;
		};

		while (true) {
			const { done, value } = await reader.read();
			if (done) {
				const parsed = consumeSseEvents(buffer + "\n\n");
				for (const data of parsed.events) {
					if (data === "[DONE]") break;
					try {
						const j = JSON.parse(data);
						const c = j.response || j.choices?.[0]?.delta?.content || "";
						if (c) { responseText += c; flush(); }
					} catch (_) {}
				}
				break;
			}
			buffer += decoder.decode(value, { stream: true });
			const parsed = consumeSseEvents(buffer);
			buffer = parsed.buffer;
			for (const data of parsed.events) {
				if (data === "[DONE]") { sawDone = true; buffer = ""; break; }
				try {
					const j = JSON.parse(data);
					const c = j.response || j.choices?.[0]?.delta?.content || "";
					if (c) { responseText += c; flush(); }
				} catch (_) {}
			}
			if (sawDone) break;
		}

		// Final render — no cursor
		if (responseText) {
			bubble.innerHTML = renderMarkdown(responseText);
			highlightCode(bubble);
			chatHistory.push({ role: "assistant", content: responseText });
			if (conv) {
				conv.messages = chatHistory.filter((m) => m.role !== "system");
				saveConversations();
			}
		}
		chatMessages.scrollTop = chatMessages.scrollHeight;
	} catch (err) {
		console.error(err);
		typingWrapper.classList.remove("visible");
		chatMessages.appendChild(
			createMessageEl({
				role: "assistant",
				content: "Sorry, something went wrong. Please try again.",
			}),
		);
	} finally {
		isProcessing = false;
		sendButton.disabled = false;
		userInput.disabled = false;
		userInput.focus();
		typingWrapper.classList.remove("visible");
	}
}

// === SSE parser (unchanged from original) ===
function consumeSseEvents(buffer) {
	let normalized = buffer.replace(/\r/g, "");
	const events = [];
	let idx;
	while ((idx = normalized.indexOf("\n\n")) !== -1) {
		const raw = normalized.slice(0, idx);
		normalized = normalized.slice(idx + 2);
		const dataLines = [];
		for (const line of raw.split("\n")) {
			if (line.startsWith("data:"))
				dataLines.push(line.slice("data:".length).trimStart());
		}
		if (dataLines.length) events.push(dataLines.join("\n"));
	}
	return { events, buffer: normalized };
}
