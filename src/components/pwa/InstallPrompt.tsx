import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed" | "canceled" | string;
    platform: string;
  }>;
}

export const InstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [platform, setPlatform] = useState<
    "ios" | "android" | "desktop" | "unknown"
  >("unknown");
  useEffect(() => {
    if (typeof window === "undefined") return;

    const ua = window.navigator.userAgent || "";
    const isIOS = /iphone|ipad|ipod/i.test(ua);
    const isAndroid = /android/i.test(ua);

    if (isIOS) {
      setPlatform("ios");
    } else if (isAndroid) {
      setPlatform("android");
    } else {
      setPlatform("desktop");
    }

    const alreadyDismissed =
      window.localStorage.getItem("pwa-install-dismissed") === "true";

    // Fallback: em alguns navegadores iOS o beforeinstallprompt não dispara.
    // Nestes casos, mostramos um banner instrucional mesmo sem deferredPrompt.
    if (isIOS && !alreadyDismissed) {
      setIsVisible(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (alreadyDismissed) return;
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    const handleAppInstalled = () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      window.localStorage.setItem("pwa-install-dismissed", "true");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      setIsVisible(false);
      window.localStorage.setItem("pwa-install-dismissed", "true");
    } else {
      window.localStorage.setItem("pwa-install-dismissed", "true");
      setIsVisible(false);
    }

    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    window.localStorage.setItem("pwa-install-dismissed", "true");
    setIsVisible(false);
  };

  const handleIosInstructions = () => {
    // Mantemos simples: o usuário fecha depois de ler as instruções.
    window.localStorage.setItem("pwa-install-dismissed", "true");
    setIsVisible(false);
  };

  if (!isVisible) return null;

  const titleByPlatform: Record<typeof platform, string> = {
    ios: "Instale o app New Gestão no seu iPhone",
    android: "Instale o app New Gestão no seu Android",
    desktop: "Instale o app New Gestão no seu dispositivo",
    unknown: "Instale o app New Gestão",
  };

  const descriptionByPlatform: Record<typeof platform, string> = {
    ios:
      "No iPhone, toque em Compartilhar e escolha 'Adicionar à Tela de Início' para usar o New Gestão em tela cheia.",
    android:
      "No Android, use a opção 'Instalar app' do navegador para adicionar o New Gestão à tela inicial.",
    desktop:
      "Instale o New Gestão para abrir em janela própria, com acesso rápido e melhor desempenho.",
    unknown:
      "Adicione o New Gestão à tela inicial para acessar mais rápido, em modo tela cheia e com melhor desempenho.",
  };

  const primaryButtonLabel =
    platform === "ios" || !deferredPrompt ? "Entendi, vou instalar" : "Instalar app";

  const handlePrimaryClick =
    platform === "ios" || !deferredPrompt ? handleIosInstructions : handleInstallClick;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-4 sm:pb-6 pointer-events-none">
      <Card
        variant="elevated"
        className="pointer-events-auto w-full max-w-md border-primary/40 shadow-primary bg-background/95 backdrop-blur"
        aria-label="Instalar aplicativo New Gestão"
        role="dialog"
      >
        <CardContent className="flex flex-col gap-3 pt-4 sm:pt-6">
          <div>
            <h2 className="text-base sm:text-lg font-semibold">
              {titleByPlatform[platform]}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {descriptionByPlatform[platform]}
            </p>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
            >
              Agora não
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={handlePrimaryClick}
              autoFocus
            >
              {primaryButtonLabel}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
