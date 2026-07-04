import { Card, FullScreen } from '../components/ui'

const EFFECTIVE_DATE = 'July 4, 2026'
const CONTACT_EMAIL = 'higcclg@gmail.com'

function Section({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <section className="mb-6">
      <h3 className="text-ink font-bold text-[15px] mb-1.5">{heading}</h3>
      <p className="text-[15px] text-ink-dim leading-relaxed">{children}</p>
    </section>
  )
}

export function LegalPage({
  kind,
  onBack,
}: {
  kind: 'privacy' | 'terms'
  onBack: () => void
}) {
  const title = kind === 'privacy' ? 'Privacy Policy' : 'Terms of Use'

  return (
    <FullScreen title={title} onBack={onBack}>
      <div className="max-w-lg mx-auto">
        <p className="text-[13px] text-ink-faint mb-6">Effective {EFFECTIVE_DATE}</p>

        {kind === 'privacy' ? (
          <>
            <Section heading="Your data stays on your device">
              Hammerlog stores all of your data — workouts, nutrition logs, bodyweight
              history, and settings — locally on this device using your browser's storage.
              Nothing is uploaded anywhere.
            </Section>
            <Section heading="No servers, no accounts">
              There are no servers behind Hammerlog, no accounts to create, and no sign-in.
              The app runs entirely on your device.
            </Section>
            <Section heading="No tracking">
              Hammerlog contains no analytics, no tracking, no advertising, and no cookies.
              We do not collect, transmit, or sell any information, because your data never
              leaves the device in the first place.
            </Section>
            <Section heading="Exporting your data">
              The Export feature creates a file that you control. It is saved wherever you
              choose, and it is yours to keep, move, or delete. Hammerlog never sees it.
            </Section>
            <Section heading="Deleting your data">
              Clearing this site's data in your browser, or using Reset inside Hammerlog,
              permanently erases everything on this device. Because there are no servers,
              there is no backup and no way to recover deleted data remotely. Export first if
              you want to keep a copy.
            </Section>
            <Section heading="Contact">
              Questions about this policy? Reach out at {CONTACT_EMAIL}.
            </Section>
          </>
        ) : (
          <>
            <Section heading="Personal use, as-is">
              Hammerlog is provided for your personal use, free of charge and "as is," without
              warranty of any kind. You use it at your own discretion and risk.
            </Section>

            <Card className="border-ember/40 p-4 mb-6">
              <h3 className="text-ink font-bold text-[15px] mb-1.5">Not medical advice</h3>
              <p className="text-[15px] text-ink-dim leading-relaxed">
                Hammerlog is not a medical device and provides no medical, health, or
                nutritional advice. Calorie and macro targets, along with estimated one-rep-max
                (1RM) values, are informational estimates only and may be inaccurate for you.
                Consult a qualified professional — such as a doctor or a registered dietitian —
                before making any diet or exercise decisions, especially for minors.
              </p>
            </Card>

            <Section heading="Back up your own data">
              You are responsible for backing up your data using the Export feature. Because all
              data lives only on this device, uninstalling, clearing browser storage, or
              resetting the app will permanently erase it with no way to recover it.
            </Section>
            <Section heading="Limitation of liability">
              To the maximum extent permitted by law, Hammerlog and its author are not liable for
              any loss, injury, or damages arising from your use of the app or reliance on its
              estimates.
            </Section>
            <Section heading="Contact">
              Questions about these terms? Reach out at {CONTACT_EMAIL}.
            </Section>
          </>
        )}
      </div>
    </FullScreen>
  )
}
