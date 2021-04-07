create table test1 (
  
 	name varchar(20) check(typeof(name) = 'text' and length(name)<=20)
  )

  create table test2 (
  
 	b int check(b = 0 or b = 1)
  )

  