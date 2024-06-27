"use client";

import React from "react";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { signup } from "@/app/actions/signup";
import { useRouter } from "next/navigation";

const formSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(4, "Email is too short")
    .email("Invalid email"),
  password: z.string().min(8, "Password is too short"),
});

function SignupPage() {
  const router = useRouter();

  // 1. Define your form.
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isDisabled = form.formState.isSubmitting;

  // 2. Define a submit handler.
  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const formData = new FormData();
      formData.append("email", values.email);
      formData.append("password", values.password);

      const signupRes = await signup(formData);

      if (!signupRes.success) {
        alert(signupRes.message);
        return;
      }

      alert("Check your email for a confirmation link.");

      form.reset();
      router.push("/auth/signin");
      router.refresh();
    } catch (error: any) {
      console.error(error);
      alert(error.message);
    }
  }
  return (
    <div className="w-screen h-screen flex flex-col items-center px-2 py-12 max-w-[640px]">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Sign Up</CardTitle>
          <CardDescription>Sign up to access your account</CardDescription>
        </CardHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <CardContent>
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input placeholder="johndoe@example.com" {...field} />
                    </FormControl>
                    <FormDescription>This is your email</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Password"
                        type="password"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>This is your password</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isDisabled}>
                Submit
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}

export default SignupPage;
