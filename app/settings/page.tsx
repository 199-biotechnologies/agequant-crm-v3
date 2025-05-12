import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DefaultsSettingsPage } from './defaults/page';
import { EntitiesSettingsPage } from './entities/page';
import { PaymentSourcesSettingsPage } from './payment-sources/page';

export default function SettingsPage() {
  // TODO: Later, these child pages might need to be actual route segments
  // if we want distinct URLs like /settings/defaults.
  // For now, rendering them as components within tabs on /settings.
  // The front-end-ui.md suggests /settings/entities, /settings/payment-sources, /settings/defaults
  // which implies they should be actual sub-routes.
  // This initial setup uses client-side tab switching on a single /settings page.
  // This can be refactored to use Next.js sub-routes with a layout later if needed.

  return (
    // <AppLayout> // Removed redundant AppLayout wrapper
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
      </div>
      <Tabs defaultValue="defaults" className="space-y-4">
        <TabsList>
          <TabsTrigger value="defaults">Application Defaults</TabsTrigger>
          <TabsTrigger value="entities">Issuing Entities</TabsTrigger>
          <TabsTrigger value="payment-sources">Payment Sources</TabsTrigger>
        </TabsList>
        <TabsContent value="defaults" className="space-y-4">
          <DefaultsSettingsPage />
        </TabsContent>
        <TabsContent value="entities" className="space-y-4">
          <EntitiesSettingsPage />
        </TabsContent>
        <TabsContent value="payment-sources" className="space-y-4">
          <PaymentSourcesSettingsPage />
        </TabsContent>
      </Tabs>
    </div>
    // </AppLayout>
  );
}
