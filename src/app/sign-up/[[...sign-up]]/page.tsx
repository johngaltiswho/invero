import { SignUp } from '@clerk/nextjs';

export default function SignUpPage() {
  return (
    <div className="min-h-screen bg-neutral-darker flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="text-center text-3xl font-bold text-primary mb-2">
            Create Account
          </h1>
          <p className="text-center text-secondary mb-8">
            Join the institutional revolution
          </p>
        </div>
        
        <div className="bg-neutral-dark p-8 rounded-lg border border-neutral-medium">
          <SignUp 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-transparent shadow-none border-none",
                header: "hidden",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                
                // Form styling to match custom design
                formFieldInput: "bg-neutral-medium border border-neutral-medium text-primary placeholder-secondary rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-orange focus:border-accent-orange transition-all",
                formFieldLabel: "text-secondary text-sm font-medium mb-1 block",
                formFieldAction: "text-accent-orange hover:text-accent-orange/80 text-sm",
                
                // Primary button (Sign Up)
                formButtonPrimary: "w-full bg-accent-orange hover:bg-orange-600 text-white font-medium py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-orange focus:ring-offset-2",
                
                // Social buttons
                socialButtonsBlockButton: "w-full bg-neutral-medium border border-neutral-medium text-secondary hover:bg-neutral-light hover:text-primary transition-colors rounded-lg py-3 px-4 font-medium",
                socialButtonsBlockButtonText: "text-sm",
                
                // Links and text
                formFieldSuccessText: "text-green-500 text-sm",
                formFieldErrorText: "text-red-500 text-sm",
                identityPreviewText: "text-primary",
                identityPreviewEditButton: "text-accent-orange hover:text-accent-orange/80",
                
                // Footer
                footerActionText: "text-secondary text-sm",
                footerActionLink: "text-accent-orange hover:text-accent-orange/80 font-medium",
                
                // Divider
                dividerLine: "bg-neutral-medium",
                dividerText: "text-secondary bg-neutral-dark px-2 text-sm",
                
                // Form container
                form: "space-y-4",
                formFieldRow: "space-y-1",
              },
              layout: {
                socialButtonsPlacement: "bottom"
              }
            }}
          />
        </div>

        <div className="text-center">
          <p className="text-sm text-secondary">
            Already have an account?{' '}
            <a href="/sign-in" className="text-accent-orange hover:text-accent-orange/80 font-medium">
              Sign in
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}