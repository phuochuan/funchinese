import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
    select: {
      id:     true,
      name:   true,
      email:  true,
      image:  true,
      role:   true,
      profile: {
        select: {
          id:          true,
          bio:         true,
          phone:       true,
          dateOfBirth: true,
          gender:      true,
          avatar:      true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.keycloakId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { name, bio, phone, dateOfBirth, gender } = body;

  const user = await prisma.user.findUnique({
    where: { keycloakId: session.user.keycloakId },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Upsert profile
  const profile = await prisma.userProfile.upsert({
    where:  { userId: user.id },
    create: {
      userId:      user.id,
      bio:         bio ?? null,
      phone:       phone ?? null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender:      gender ?? null,
    },
    update: {
      bio:         bio ?? null,
      phone:       phone ?? null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      gender:      gender ?? null,
    },
  });

  // Update name on User if provided
  if (name !== undefined) {
    await prisma.user.update({
      where: { id: user.id },
      data:  { name },
    });
  }

  return NextResponse.json({
    ...user,
    name:  name ?? user.name,
    profile: { ...profile, id: profile.id },
  });
}
