import { useState } from 'react';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-sm font-semibold text-brand-600">Contact</p>
      <h1 className="mt-2 font-display text-4xl font-semibold">Talk with the planning desk</h1>
      <p className="mt-3 text-stone-500">For venue partnerships, planner onboarding, or account help in Mogadishu.</p>
      {sent ? <p className="mt-10 rounded-2xl bg-emerald-50 p-6 text-emerald-800">Message received. We will reply to the email you entered.</p> : (
        <form onSubmit={(e) => { e.preventDefault(); setSent(true); }} className="mt-10 space-y-4 rounded-3xl bg-white p-8 shadow-sm">
          <input required name="name" placeholder="Name" className="w-full rounded-xl border px-4 py-3" />
          <input required type="email" name="email" placeholder="Email" className="w-full rounded-xl border px-4 py-3" />
          <textarea required rows="5" name="message" placeholder="How can we help?" className="w-full rounded-xl border px-4 py-3" />
          <button className="rounded-full bg-brand-600 px-6 py-3 font-semibold text-white">Send message</button>
        </form>
      )}
    </div>
  );
}
