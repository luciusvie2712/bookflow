-- AddForeignKey
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_subscription_plan_id_fkey" FOREIGN KEY ("subscription_plan_id") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;
