import { Suspense, type JSX } from 'react';
import {
  ExternalLink,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Settings2,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { getProfile } from '@/lib/levis/account';
import { BRANCHES, LEVIS_PORTAL_ACCOUNT_URL } from '@/lib/levis/config';
import type { Profile } from '@/types';
import { withAccount } from '@/lib/account/dal';
import { PLACEHOLDER_PROFILE } from '@/lib/account/placeholders';
import { SkeletonScope } from '@/components/ui/Skeleton';
import { Card, PageHeader } from '@/components/account/PageParts';
import { PreferencesForm } from '@/components/account/PreferencesForm';

export default function ProfilePage(): JSX.Element {
  return (
    <>
      <PageHeader title="Profil" subtitle="Coordonnées et préférences de votre dossier." />
      <Suspense
        fallback={
          <SkeletonScope label="Chargement de votre profil…">
            <ProfileContent profile={PLACEHOLDER_PROFILE} />
          </SkeletonScope>
        }
      >
        <ProfileSection />
      </Suspense>
      <SecurityCard />
    </>
  );
}

async function ProfileSection(): Promise<JSX.Element> {
  return <ProfileContent profile={await withAccount(getProfile)} />;
}

function ProfileContent({ profile }: { profile: Profile }): JSX.Element {
  const address = [profile.street, profile.city, profile.postalCode].filter(Boolean).join(', ');
  return (
    <>
      <Card title="Coordonnées" icon={UserRound}>
        <dl className="flex flex-col gap-3 text-sm">
          <Row label="Nom" value={profile.fullName} icon={UserRound} />
          {address && <Row label="Adresse" value={address} icon={MapPin} />}
          {profile.phone && <Row label="Téléphone" value={profile.phone} icon={Phone} />}
          {profile.email && <Row label="Courriel" value={profile.email} icon={Mail} />}
        </dl>
        <p className="text-xs text-zinc-500">
          Pour modifier vos coordonnées, adressez-vous au comptoir de votre bibliothèque.
        </p>
      </Card>

      <Card title="Préférences" icon={Settings2}>
        <PreferencesForm preferences={profile.preferences} branches={BRANCHES} />
      </Card>
    </>
  );
}

function SecurityCard(): JSX.Element {
  return (
    <>
      <Card title="Sécurité" icon={ShieldCheck}>
        <a
          href={LEVIS_PORTAL_ACCOUNT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between gap-2 rounded-xl border border-zinc-200 p-3 text-sm font-medium text-zinc-800 hover:border-[#d4a853] dark:border-zinc-800 dark:text-zinc-200"
        >
          <span className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-[#d4a853]" aria-hidden />
            Changer mon NIP sur le portail des bibliothèques
          </span>
          <ExternalLink className="h-4 w-4 text-zinc-400" aria-hidden />
        </a>
        <p className="text-xs leading-relaxed text-zinc-500">
          LévisBiblio ne conserve ni votre numéro de carte ni votre NIP. Seule la session ouverte
          auprès des bibliothèques est gardée, chiffrée, dans votre navigateur, et expire après 30
          minutes.
        </p>
      </Card>
    </>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof UserRound;
}): JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-zinc-400" aria-hidden />
      <div className="min-w-0">
        <dt className="text-xs text-zinc-500">{label}</dt>
        <dd className="font-medium break-words text-zinc-900 dark:text-zinc-100">{value}</dd>
      </div>
    </div>
  );
}
