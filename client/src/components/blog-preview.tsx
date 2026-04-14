import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

const posts = [
  {
    category: "Nutrition",
    title: "The Ultimate Guide to Grain-Free Diets for Aussie Dogs",
    excerpt: "Is grain-free right for your dog? Our vets break down the science behind the trend and what Australian pet parents need to know.",
    readTime: "5 min read",
    color: "bg-sage",
  },
  {
    category: "Wellbeing",
    title: "5 Signs Your Dog Is Thriving (Not Just Surviving)",
    excerpt: "From coat shine to energy levels — here's how to tell if your furry mate is truly living their best life.",
    readTime: "4 min read",
    color: "bg-terracotta",
  },
  {
    category: "Sustainability",
    title: "How We're Making Pet Products Planet-Friendly",
    excerpt: "Our journey to zero-waste packaging and what it means for the Australian pet industry.",
    readTime: "3 min read",
    color: "bg-dusty-blue",
  },
];

export function BlogPreview() {
  return (
    <section id="blog" className="bg-cream py-16 sm:py-24" data-testid="section-blog">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12">
          <div>
            <p className="text-sm font-medium uppercase tracking-widest text-terracotta mb-3" data-testid="text-blog-eyebrow">
              From the Blog
            </p>
            <h2 className="font-serif text-3xl font-bold text-dark sm:text-4xl" data-testid="text-blog-title">
              Tails &amp; <span className="text-sage">tips</span>
            </h2>
          </div>
          <Button variant="outline" className="text-dark rounded-full self-start sm:self-auto" style={{ border: "1px solid rgba(0,0,0,0.1)" }} data-testid="button-all-posts">
            All Posts
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {posts.map((post, i) => (
            <Card key={i} className="group bg-card overflow-visible hover-elevate transition-all duration-300" data-testid={`card-blog-${i}`}>
              <CardContent className="p-0">
                <div className={`aspect-[16/9] ${post.color}/10 flex items-center justify-center rounded-t-lg`}>
                  <BookOpen className={`h-10 w-10 ${post.color === "bg-sage" ? "text-sage" : post.color === "bg-terracotta" ? "text-terracotta" : "text-dusty-blue"} opacity-40`} />
                </div>
                <div className="p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="text-xs font-medium rounded-full" data-testid={`badge-blog-category-${i}`}>
                      {post.category}
                    </Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {post.readTime}
                    </span>
                  </div>
                  <h3 className="font-serif font-bold text-dark leading-snug" data-testid={`text-blog-title-${i}`}>
                    {post.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">
                    {post.excerpt}
                  </p>
                  <button className="inline-flex items-center gap-1 text-sm font-medium text-sage" data-testid={`button-read-more-${i}`}>
                    Read More
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
