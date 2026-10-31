import type { EmailMessage, GmailAction } from '@/types';

const LABEL_STYLES: Record<string, string> = {
  INBOX: 'bg-paper-deep text-ink-muted',
  UNREAD: 'bg-primary-50 text-primary-800',
  STARRED: 'bg-primary-100 text-primary-700',
};

const EXIT_CLASS: Record<GmailAction, string> = {
  ARCHIVE: 'animate-card-archive',
  KEEP: 'animate-card-keep',
  STAR: 'animate-card-star',
};

export interface GhostCard {
  key: number;
  email: EmailMessage;
  action: GmailAction;
}

interface InboxCardStackProps {
  emails: EmailMessage[];
  ghost: GhostCard | null;
}

export function InboxCardStack({ emails, ghost }: InboxCardStackProps) {
  const visible = emails.slice(0, 3);

  return (
    <div className="relative mx-auto h-[300px] w-full max-w-xl sm:h-[320px]">
      {visible.map((email, depth) => (
        <div
          key={email.id}
          className="absolute inset-x-0 top-0 transition-transform duration-300 ease-out"
          style={{
            transform: `translateY(${depth * 12}px) scale(${1 - depth * 0.04})`,
            zIndex: visible.length - depth,
            opacity: 1 - depth * 0.2,
          }}
        >
          <EmailCard email={email} />
        </div>
      ))}

      {ghost && (
        <div
          key={ghost.key}
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 z-50 ${EXIT_CLASS[ghost.action]}`}
        >
          <EmailCard email={ghost.email} />
        </div>
      )}
    </div>
  );
}

function EmailCard({ email }: { email: EmailMessage }) {
  return (
    <article className="rounded-3xl border border-line bg-surface p-6 shadow-lift sm:p-8">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-semibold text-primary-800">
          {email.from.charAt(0).toUpperCase()}
        </div>
        <p className="min-w-0 truncate text-sm font-semibold text-ink">{email.from}</p>
      </div>

      <h2 className="mt-5 text-lg font-semibold leading-snug text-ink sm:text-xl">{email.subject}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-muted">{email.snippet}</p>

      <ul className="mt-5 flex flex-wrap gap-2" aria-label="Labels">
        {email.labels.map((label) => (
          <li
            key={label}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${LABEL_STYLES[label] ?? 'bg-paper-deep text-ink-muted'}`}
          >
            {label}
          </li>
        ))}
      </ul>
    </article>
  );
}
