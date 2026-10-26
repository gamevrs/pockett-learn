import React from "react";
import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal/LegalPage";
import { COMPANY, COMPANY_ADDRESS, COMPANY_FULL, CONTACT_EMAIL, GOVERNING_LAW, SITE, SITE_HOST, VENUE } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `The rules for using ${SITE} (${SITE_HOST}): who can use it, acceptable use of the code runner, ownership of your code and our content, and legal terms.`,
};

const mail = <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>;

const sections: LegalSection[] = [
  {
    id: "acceptance",
    title: "Accepting these terms",
    body: (
      <>
        <p>
          These Terms of Service (&ldquo;Terms&rdquo;) are an agreement between you and {COMPANY_FULL} (&ldquo;we&rdquo;,
          &ldquo;us&rdquo;) about your use of {SITE} at {SITE_HOST}, including its lessons, editor, code runner and any
          account you create (the &ldquo;Service&rdquo;). By using the Service you agree to these Terms and to our{" "}
          <a href="/privacy">Privacy Policy</a>. If you do not agree, please do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: "who-can-use",
    title: "Who can use the Service",
    body: (
      <>
        <p>
          You must be at least 13 years old, or older if the age of digital consent where you live is higher, to use the
          Service. If you are under the age of majority where you live, you may use it only with the permission of a parent
          or legal guardian who agrees to these Terms on your behalf. You must not use the Service if the law prohibits you
          from doing so.
        </p>
      </>
    ),
  },
  {
    id: "accounts",
    title: "Your account",
    body: (
      <>
        <p>
          You can use most of the Service without an account. An account lets you save progress across devices. When you
          create one, give us accurate information, keep your password confidential, and tell us promptly at {mail} if you
          think someone has accessed your account. You are responsible for activity under your account. One person per
          account, please.
        </p>
      </>
    ),
  },
  {
    id: "the-service",
    title: "The Service is free and may change",
    body: (
      <>
        <p>
          The Service is provided free of charge. We may add, change, limit or remove features, lessons, languages or the
          Service itself at any time, including usage limits on the code runner, with or without notice. We do not promise that
          the Service will always be available, uninterrupted or error-free, or that your progress will never be lost, so
          keep your own copies of any code you care about.
        </p>
      </>
    ),
  },
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <>
        <p>
          The code runner executes programs on shared infrastructure, so we ask everyone to play fair. You agree not to:
        </p>
        <ul>
          <li>try to break out of, probe, or bypass the sandbox or any other security or isolation measure;</li>
          <li>use the Service to mine cryptocurrency or to run work unrelated to learning;</li>
          <li>attack, scan, or send traffic to other systems, people or networks, or try to do so;</li>
          <li>overload, disrupt or degrade the Service, including by sending runs far faster than a person would;</li>
          <li>circumvent or evade rate limits, usage limits or access controls, including by using multiple accounts or automated tools;</li>
          <li>scrape, crawl, copy or bulk-download lessons or other content other than as ordinary search engines do;</li>
          <li>upload, run or share code or content that is illegal, malicious (such as malware), infringing, harassing or otherwise harmful;</li>
          <li>access another person&rsquo;s account or data, or impersonate anyone; or</li>
          <li>use the Service in a way that breaks the law or the rights of others.</li>
        </ul>
        <p>
          We may monitor use of the code runner in aggregate and take action to protect the Service, including blocking
          requests, limiting access or suspending accounts.
        </p>
      </>
    ),
  },
  {
    id: "your-code",
    title: "Your code",
    body: (
      <>
        <p>
          You own the code you write. You give {COMPANY} a limited, worldwide, non-exclusive, royalty-free license to host,
          store, copy, process and run that code, and to transmit it between your devices, solely so we can operate and
          provide the Service to you (for example, to run it in the sandbox, to sync your drafts and to show you your
          completed lessons). This license ends when you delete the code or your account, except for temporary copies in
          backups. You are responsible for your code and for having the right to use anything you put in it.
        </p>
      </>
    ),
  },
  {
    id: "our-content",
    title: "Our content",
    body: (
      <>
        <p>
          The Service, including its lessons, projects, text, scenes, animations, illustrations, design, the {SITE} name and
          logo, and the software that runs it, is owned by {COMPANY} or its licensors and is protected by copyright and other
          laws. All rights are reserved except as stated here.
        </p>
        <p>
          We give you a personal, non-exclusive, non-transferable, revocable license to use the Service and its content for
          your own non-commercial learning. You may not copy, republish, redistribute, sell, sublicense, or create derivative
          works from the courses or other content, or use them to train a competing product or to build a competing course,
          without our written permission. Feedback you send us may be used by us without obligation to you.
        </p>
      </>
    ),
  },
  {
    id: "third-party",
    title: "Third-party software and services",
    body: (
      <>
        <p>
          The Service relies on open-source software and third-party services, including hosting, authentication and code
          delivery providers, and public libraries and package registries that some lessons load. These are subject to their
          own licenses and terms, which apply to your use of them. We are not responsible for third-party services, and their
          availability or content may change.
        </p>
      </>
    ),
  },
  {
    id: "disclaimers",
    title: "Disclaimers",
    body: (
      <>
        <p>
          THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo;, WITHOUT WARRANTIES OF ANY KIND, EXPRESS
          OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY AND NON-INFRINGEMENT.
          WE DO NOT WARRANT THAT THE SERVICE OR ITS LESSONS WILL BE ERROR-FREE, SECURE OR UNINTERRUPTED, OR THAT RUNNING CODE
          WILL ALWAYS PRODUCE THE RESULT YOU EXPECT. Lessons are educational and are not professional, legal or career advice,
          and we do not guarantee any learning outcome. Some places do not allow certain disclaimers, so some of these may not
          apply to you.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    title: "Limitation of liability",
    body: (
      <>
        <p>
          TO THE FULLEST EXTENT PERMITTED BY LAW, {COMPANY.toUpperCase()} AND ITS MEMBERS, OFFICERS, EMPLOYEES AND SUPPLIERS
          WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL OR PUNITIVE DAMAGES, OR FOR LOSS OF PROFITS,
          DATA OR GOODWILL, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY FOR ANY CLAIM RELATING TO
          THE SERVICE WILL NOT EXCEED ONE HUNDRED US DOLLARS (US$100). Nothing in these Terms limits liability that cannot be
          limited by law.
        </p>
      </>
    ),
  },
  {
    id: "indemnity",
    title: "Indemnity",
    body: (
      <>
        <p>
          To the extent permitted by law, you agree to defend and indemnify {COMPANY} against claims, damages and expenses
          (including reasonable legal fees) arising from your breach of these Terms, your code, or your misuse of the Service.
        </p>
      </>
    ),
  },
  {
    id: "termination",
    title: "Suspension and termination",
    body: (
      <>
        <p>
          You can stop using the Service at any time and can ask us to delete your account by emailing {mail}. We may suspend
          or end your access, or remove content, at any time, particularly if we believe you have broken these Terms or put
          the Service or others at risk. Sections that by their nature should survive termination (such as ownership,
          disclaimers, liability and governing law) will survive.
        </p>
      </>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law and disputes",
    body: (
      <>
        <p>
          These Terms are governed by the laws of {GOVERNING_LAW}, without regard to conflict-of-laws rules. Any dispute
          arising from these Terms or the Service will be brought in {VENUE}, and you and we
          consent to their jurisdiction, except that either of us may seek urgent relief in any competent court. If you are a
          consumer, you also keep any mandatory protections of the law where you live.
        </p>
        <p>
          We would rather solve a problem than argue about it. Please email {mail} first and give us a chance to put it right.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    title: "Changes to these terms",
    body: (
      <>
        <p>
          We may update these Terms from time to time. We will change the effective date above, and for material changes we
          will give additional notice, such as a notice on the site. If you keep using the Service after the changes take
          effect, you accept the updated Terms. If you do not agree, stop using the Service.
        </p>
      </>
    ),
  },
  {
    id: "general",
    title: "General",
    body: (
      <>
        <p>
          These Terms and the Privacy Policy are the whole agreement between you and us about the Service. If a part of them
          is found unenforceable, the rest stays in effect. Our not enforcing a term is not a waiver of it. You may not
          assign these Terms without our consent; we may assign them as part of a merger, acquisition or sale of assets.
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
          Questions about these Terms? Email {mail}, or write to us at {COMPANY}, {COMPANY_ADDRESS}.
        </p>
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      intro={
        <p>
          These terms cover how you can use {SITE}. The short version: it is free, use it to learn, be kind to the shared code
          runner, you own the code you write, and we own the lessons.
        </p>
      }
      sections={sections}
      other={{ href: "/privacy", label: "Read the Privacy Policy" }}
    />
  );
}
