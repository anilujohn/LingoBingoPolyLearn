import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import LanguageHub from "@/pages/language-hub";
import LearningInterface from "@/pages/learning-interface";
import LanguageInterface from "@/pages/language-interface";
import TopNavigation from "@/components/top-navigation";

function Router() {
  return (
    <div className="min-h-screen bg-slate-50">
      <TopNavigation />
      <Switch>
        <Route path="/" component={LanguageHub} />
        <Route path="/learn/:languageId" component={LanguageInterface} />
        <Route path="/learn/:languageId/:mode" component={LearningInterface} />
        <Route path="/translate/:languageId" component={LanguageInterface} />
        <Route>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">Page not found</p>
          </div>
        </Route>
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
