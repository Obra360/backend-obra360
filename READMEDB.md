# 24/07/25, se agrego tabla "Salarios" al supabase, con sql.
# 24/07/25, se agrega policies a la tabla Obra tipo SELECT, INSERT, UPDATE y DELETE
# 24/07/25, se agrega funciones y triggers para trasladar (sincronizar) los datos del usuario autenticado de Supabase (auth.users) a la propia tabla user
# VVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

