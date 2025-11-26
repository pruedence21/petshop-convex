"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FixProfilePage() {
    const registerSelf = useMutation(api.userManagement.registerSelf);
    const [status, setStatus] = useState("Idle");
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFix = async () => {
        setStatus("Fixing...");
        setError(null);
        try {
            const res = await registerSelf();
            setResult(res);
            setStatus("Success");
        } catch (err: any) {
            setError(err.message);
            setStatus("Error");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <Card className="w-[400px]">
                <CardHeader>
                    <CardTitle>Fix User Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-gray-500">
                        Click the button below to create your user profile and assign the Admin role.
                    </p>

                    <Button
                        onClick={handleFix}
                        disabled={status === "Fixing..."}
                        className="w-full"
                    >
                        {status === "Fixing..." ? "Fixing..." : "Fix Profile"}
                    </Button>

                    {status === "Success" && (
                        <div className="p-4 bg-green-50 text-green-700 rounded-md">
                            <p className="font-bold">Success!</p>
                            <p>{result?.message}</p>
                            <p className="text-xs mt-2">Profile ID: {result?.profileId}</p>
                        </div>
                    )}

                    {status === "Error" && (
                        <div className="p-4 bg-red-50 text-red-700 rounded-md">
                            <p className="font-bold">Error</p>
                            <p>{error}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
