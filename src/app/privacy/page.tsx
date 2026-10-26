import React from "react";
import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY, COMPANY_ADDRESS, COMPANY_FULL, CONTACT_EMAIL, SITE, SITE_HOST } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${SITE} (${SITE_HOST}) collects, uses and protects your information, including what stays on your device and what code is sent to our servers.`,
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const sections: LegalSection[] = [
  {
    id: "who-we-are",
    title: "Who we are",
    body: (
      <>
        <p>
          {SITE} is a free site for learning to code, operated by {COMPANY_FULL} (&ldquo;we&rdquo;, &ldquo;us&rdquo;). We are the
          controller of the personal information described in this policy. You can reach us at {mail}.
        </p>
      </>
    ),
  },
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <>
        <h3>Information you give us</h3>
        <p>You can use most of {SITE} without an account. If you create one, we collect:</p>
        <ul>
          <li>
            <strong>Email address and password.</strong> Your password is handled by our authentication provider, which stores
            only a hash of it. We never see or store your password in readable form.
          </li>
          <li>
            <strong>Display name</strong>, if you choose to enter one (up to 60 characters). If you leave it blank we use the
            first part of your email address.
          </li>
          <li>
            <strong>Learning progress</strong>, so it can follow you between devices: experience points, streaks, which lessons
            you have completed, how many attempts they took, hints you have viewed, the code you submitted when you passed each
            lesson, and your in-progress drafts. Your sound on/off preference is saved with it.
          </li>
          <li>
            <strong>Messages to us.</strong> If you email us, we keep the message and your address so we can reply.
          </li>
        </ul>

        <h3>Information stored on your device</h3>
        <p>
          {SITE} saves some things in your browser&rsquo;s local storage so the site works and remembers you. This happens
          whether or not you have an account:
        </p>
        <ul>
          <li>your progress, drafts and code (so work is not lost between visits);</li>
          <li>your light or dark theme choice and your sound preference;</li>
          <li>the code and language you last used in the Playground;</li>
          <li>your workspace layout (the sizes of the editor and lesson panels);</li>
          <li>if you are signed in, your sign-in session.</li>
        </ul>
        <p>
          This information stays in your browser. Signed-out progress is never sent to us. You can remove it at any time by
          resetting your progress on the Dashboard or by clearing this site&rsquo;s data in your browser settings.
        </p>

        <h3>Information collected automatically</h3>
        <p>
          When you load the site, our hosting provider receives the technical details your browser sends with every request,
          such as your IP address, browser and device type, and the pages requested. Providers keep standard server logs for
          security and reliability. We do not run advertising trackers, and we do not use third-party analytics or advertising
          cookies.
        </p>

        <h3>Code you run</h3>
        <p>How your code is run depends on the language:</p>
        <ul>
          <li>
            <strong>Python, JavaScript and SQL</strong> run entirely inside your browser, on your device. That code is not sent
            to our servers to be run.
          </li>
          <li>
            <strong>C#, C++ and Go</strong> need a compiler, so when you press Run, the program you wrote (and any input it
            reads) is sent to our servers, compiled and run in an isolated, temporary sandbox with no network access, and the
            output is sent back to you. We do not save your program or its output, and we do not write them to our logs. The
            sandbox is operated for us by our hosting provider (Vercel) and is discarded shortly after use. We log only
            operational details about each run, such as the language, how long it took and whether it succeeded.
          </li>
        </ul>
        <p>
          To limit abuse, we count how often each IP address uses the code runner. These counters are kept briefly in
          memory (for about a minute) and are not stored in a database.
        </p>
        <p>
          Please do not put passwords, secrets or other people&rsquo;s personal information into code you run.
        </p>
      </>
    ),
  },
  {
    id: "how-we-use-it",
    title: "How we use information",
    body: (
      <>
        <p>We use the information above to:</p>
        <ul>
          <li>provide the lessons, the editor, the code runner and your account;</li>
          <li>save and sync your progress across your devices;</li>
          <li>send account emails, such as an email-confirmation link or a password-reset link (we do not send marketing email);</li>
          <li>keep the service secure, prevent abuse and enforce our <a href="/terms">Terms of Service</a>;</li>
          <li>fix problems and improve the lessons and the site; and</li>
          <li>comply with the law and respond to legal requests.</li>
        </ul>
        <p>We do not sell your personal information, and we do not use it for targeted advertising.</p>
      </>
    ),
  },
  {
    id: "legal-bases",
    title: "Legal bases (EEA and UK)",
    body: (
      <>
        <p>If you are in the European Economic Area or the United Kingdom, we process your information on these bases:</p>
        <ul>
          <li>
            <strong>Contract</strong>: to run your account, sync your progress and provide the features you ask for.
          </li>
          <li>
            <strong>Legitimate interests</strong>: to keep the service secure, prevent abuse and improve it, where these
            interests are not outweighed by your rights.
          </li>
          <li>
            <strong>Legal obligation</strong>: where the law requires us to keep or disclose information.
          </li>
          <li>
            <strong>Consent</strong>: where we ask for it. You can withdraw consent at any time.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "sharing",
    title: "Sharing and service providers",
    body: (
      <>
        <p>
          We share information only with the service providers that run {SITE} for us, and only as needed to provide the
          service:
        </p>
        <ul>
          <li>
            <strong>Vercel</strong>: hosts the website, serves its pages, and operates the isolated sandboxes that run C#, C++
            and Go code.
          </li>
          <li>
            <strong>Supabase</strong>: provides account sign-in, sends our account emails and stores account and progress data
            in a database.
          </li>
          <li>
            <strong>Content delivery networks (CDNs)</strong>: some lessons and tools load open-source libraries (for example,
            the in-browser Python and SQL engines, the code editor, and Python packages) from public CDNs and package
            registries. Your browser requests these files directly, so those services see standard connection details such as
            your IP address.
          </li>
        </ul>
        <p>
          We may also disclose information if we believe it is required by law, to protect the rights, safety or property of
          others, or as part of a merger, acquisition or sale of assets (in which case we will tell you if your information is
          transferred and becomes subject to a different policy). We do not sell or rent your information to anyone.
        </p>
      </>
    ),
  },
  {
    id: "retention",
    title: "How long we keep information",
    body: (
      <>
        <ul>
          <li>
            <strong>Account and progress data</strong> is kept while your account is open. When you delete your account (see
            Your rights and choices), we delete it from our database.
          </li>
          <li>
            <strong>Code sent to the C#, C++ and Go runner</strong> is not stored after the run finishes.
          </li>
          <li>
            <strong>Run counters</strong> used for rate limiting are held in memory for about a minute.
          </li>
          <li>
            <strong>Server logs</strong> kept by our providers follow their own retention periods, which are typically short.
          </li>
          <li>
            <strong>Emails you send us</strong> are kept for as long as needed to handle your request and for a reasonable
            period afterwards.
          </li>
          <li>
            <strong>Data in your browser</strong> stays until you clear it.
          </li>
        </ul>
        <p>
          We may keep limited information longer where we are required to by law or need it to resolve disputes or enforce our
          terms. Deleted data may remain in provider backups for a limited time before it is overwritten.
        </p>
      </>
    ),
  },
  {
    id: "your-rights",
    title: "Your rights and choices",
    body: (
      <>
        <p>You are in control of your information:</p>
        <ul>
          <li>
            <strong>Reset your progress.</strong> On the Dashboard you can reset your progress. If you are signed in, this also
            removes your completed lessons, drafts and totals from our servers.
          </li>
          <li>
            <strong>Clear data on your device.</strong> Signed-out progress, drafts and preferences live only in your browser.
            Clear this site&rsquo;s data in your browser settings to remove them.
          </li>
          <li>
            <strong>Access, correct, export or delete.</strong> Email {mail} from the address on your account to ask for a copy
            of your data, to correct it, or to delete your account and everything linked to it. We will verify it is you, and
            we aim to respond within 30 days.
          </li>
          <li>
            <strong>Object or restrict.</strong> You can object to, or ask us to restrict, certain processing by emailing us.
          </li>
        </ul>
        <p>
          Depending on where you live (for example the EEA, the UK, or California and other US states), you may have
          additional rights under local law, including the right to lodge a complaint with your data protection authority. We
          will not discriminate against you for exercising your rights. We do not sell personal information or share it for
          cross-context behavioral advertising.
        </p>
      </>
    ),
  },
  {
    id: "children",
    title: "Children’s privacy",
    body: (
      <>
        <p>
          {SITE} is for a general audience and is not directed to children under 13. We do not knowingly collect personal
          information from children under 13 and do not allow them to create accounts. If you are a parent or guardian and
          believe your child under 13 has given us personal information, please contact us at {mail} and we will delete it
          promptly. In some regions the minimum age to consent to data processing is higher than 13, and in those places you
          must meet that age or have your parent&rsquo;s or guardian&rsquo;s permission.
        </p>
      </>
    ),
  },
  {
    id: "international",
    title: "International transfers",
    body: (
      <>
        <p>
          We and our service providers may process and store information in the United States and other countries, which may
          have data protection laws different from those where you live. Where required, we rely on appropriate safeguards for
          these transfers, such as standard contractual clauses offered by our providers.
        </p>
      </>
    ),
  },
  {
    id: "security",
    title: "Security",
    body: (
      <>
        <p>
          We use reasonable technical and organizational measures to protect your information. Connections to the site are
          encrypted, passwords are stored only as hashes by our authentication provider, each account&rsquo;s progress data is
          restricted to its owner, and code sent to the runner executes in an isolated sandbox with no network access. No
          system is perfectly secure, so we cannot guarantee absolute security. Choose a strong, unique password and keep it
          private.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to this policy",
    body: (
      <>
        <p>
          We may update this policy as the site changes or as the law requires. When we do, we will change the effective date
          at the top of this page, and for material changes we will give additional notice, such as a notice on the site. Using
          {" "}{SITE} after an update means you accept the updated policy.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    title: "Contact us",
    body: (
      <>
        <p>
          Questions, requests or concerns about privacy? Email {mail}, or write to us at {COMPANY}, Attention: Privacy,{" "}
          {COMPANY_ADDRESS}.
        </p>
      </>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          We built {SITE} to teach you to code, not to collect your data. This policy explains in plain language what
          we collect, why, who handles it, and the choices you have.
        </p>
      }
      sections={sections}
      other={{ href: "/terms", label: "Read the Terms of Service" }}
    />
  );
}
