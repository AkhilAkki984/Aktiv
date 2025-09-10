import { useEffect, useState, useRef } from "react";
import { chatAPI } from "../utils/api";

const Chat = () => {
  const [contacts, setContacts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const scrollRef = useRef();

  useEffect(() => {
    const fetchContacts = async () => {
      try {
        const res = await chatAPI.getContacts();
        setContacts(res.data);
      } catch (err) {
        console.error("Error fetching contacts:", err);
      }
    };
    fetchContacts();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selected) return;
      try {
        const res = await chatAPI.getMessages(selected._id);
        setMessages(res.data);
      } catch (err) {
        console.error("Error fetching messages:", err);
      }
    };
    fetchMessages();
  }, [selected]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!text.trim() || !selected) return;
    try {
      const res = await chatAPI.sendMessage(selected._id, { text });
      setMessages([...messages, res.data]);
      setText("");
    } catch (err) {
      console.error("Error sending message:", err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100">
      {/* Contacts */}
      <div className="w-1/4 border-r border-gray-700 p-4 bg-gray-800 flex flex-col">
        <h2 className="font-bold mb-4 text-lg">Messages</h2>
        <ul className="flex-1 overflow-y-auto space-y-2">
          {contacts.map((c) => (
            <li
              key={c._id}
              onClick={() => setSelected(c)}
              className={`flex items-center gap-3 p-2 rounded cursor-pointer ${
                selected?._id === c._id
                  ? "bg-blue-600"
                  : "hover:bg-gray-700"
              }`}
            >
              <img
                src={c.profilePic || `https://placehold.co/40x40`}
                alt={c.username}
                className="w-10 h-10 rounded-full border border-gray-700"
              />
              <div className="flex-1">
                <p className="font-medium">{c.username}</p>
                <span className="text-xs text-green-400">
                  {c.active ? "Active now" : "Offline"}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-gray-900">
        {selected ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-700 flex items-center gap-3">
              <img
                src={selected.profilePic || `https://placehold.co/40x40`}
                alt={selected.username}
                className="w-10 h-10 rounded-full border border-gray-700"
              />
              <div>
                <p className="font-bold">{selected.username}</p>
                <span className="text-xs text-green-400">
                  {selected.active ? "Active now" : "Offline"}
                </span>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {messages.map((msg) => (
                <div
                  key={msg._id}
                  className={`flex flex-col max-w-md ${
                    msg.sender === selected._id
                      ? "self-start bg-gray-700 text-gray-100"
                      : "self-end bg-blue-600 text-white ml-auto"
                  } p-3 rounded-lg`}
                >
                  {msg.image && (
                    <img
                      src={msg.image}
                      alt="sent media"
                      className="rounded-lg mb-1 max-h-64 object-cover"
                    />
                  )}
                  {msg.text && <p>{msg.text}</p>}
                  <span className="text-xs text-gray-400 mt-1 self-end">
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              ))}
              <div ref={scrollRef}></div>
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-700 flex gap-2">
              <input
                className="flex-1 rounded-lg p-2 bg-gray-800 border border-gray-700 text-white placeholder-gray-400 focus:outline-none"
                placeholder="Type a message..."
                value={text}
                onChange={(e) => setText(e.target.value)}
              />
              <button
                onClick={sendMessage}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            Select a contact to start chatting
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat;
