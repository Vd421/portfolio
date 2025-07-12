import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import TestPage from "./test-page";

function Router() {
  return (
    <Switch>
      <Route path="/test" component={TestPage} />
      <Route path="/" component={TestPage} />
      <Route component={TestPage} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
    </QueryClientProvider>
  );
}

export default App;
