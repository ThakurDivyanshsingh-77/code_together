import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar))",
          foreground: "hsl(var(--sidebar-foreground))",
          hover: "hsl(var(--sidebar-hover))",
          active: "hsl(var(--sidebar-active))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        editor: {
          DEFAULT: "hsl(var(--editor))",
          foreground: "hsl(var(--editor-foreground))",
          line: "hsl(var(--editor-line))",
          gutter: "hsl(var(--editor-gutter))",
        },
        tab: {
          DEFAULT: "hsl(var(--tab))",
          active: "hsl(var(--tab-active))",
          border: "hsl(var(--tab-border))",
          foreground: "hsl(var(--tab-foreground))",
          "active-foreground": "hsl(var(--tab-active-foreground))",
        },
        statusbar: {
          DEFAULT: "hsl(var(--statusbar))",
          foreground: "hsl(var(--statusbar-foreground))",
        },
        terminal: {
          DEFAULT: "hsl(var(--terminal))",
          foreground: "hsl(var(--terminal-foreground))",
        },
        syntax: {
          keyword: "hsl(var(--syntax-keyword))",
          string: "hsl(var(--syntax-string))",
          number: "hsl(var(--syntax-number))",
          function: "hsl(var(--syntax-function))",
          variable: "hsl(var(--syntax-variable))",
          comment: "hsl(var(--syntax-comment))",
          type: "hsl(var(--syntax-type))",
          operator: "hsl(var(--syntax-operator))",
        },
        user: {
          1: "hsl(var(--user-1))",
          2: "hsl(var(--user-2))",
          3: "hsl(var(--user-3))",
          4: "hsl(var(--user-4))",
          5: "hsl(var(--user-5))",
          6: "hsl(var(--user-6))",
        },
        git: {
          added: "hsl(var(--git-added))",
          modified: "hsl(var(--git-modified))",
          deleted: "hsl(var(--git-deleted))",
          untracked: "hsl(var(--git-untracked))",
        },
        scrollbar: {
          DEFAULT: "hsl(var(--scrollbar))",
          hover: "hsl(var(--scrollbar-hover))",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "Consolas", "monospace"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        pulse: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "typing-cursor": {
          "0%, 100%": { borderColor: "hsl(var(--primary))" },
          "50%": { borderColor: "transparent" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        blink: "blink 1s step-end infinite",
        "typing-cursor": "typing-cursor 1s step-end infinite",
      },
      boxShadow: {
        glow: "0 0 20px hsl(var(--primary) / 0.3), 0 0 40px hsl(var(--primary) / 0.1)",
        "glow-accent":
          "0 0 20px hsl(var(--accent) / 0.3), 0 0 40px hsl(var(--accent) / 0.1)",
        "inner-glow": "inset 0 0 20px hsl(var(--primary) / 0.1)",
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "gradient-editor":
          "linear-gradient(180deg, hsl(var(--editor)) 0%, hsl(var(--background)) 100%)",
        "gradient-sidebar":
          "linear-gradient(180deg, hsl(var(--sidebar)) 0%, hsl(var(--background)) 100%)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
