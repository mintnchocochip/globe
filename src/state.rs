#[derive(Clone)]
pub struct AppInfo {
    pub original_uri: String,
    pub shortened_uri: String,
}

impl AppInfo {
    pub fn new(uri: &str) -> Self {
        Self {
            original_uri: uri.to_string(),
            shortened_uri: shorten_uri(uri),
        }
    }
}

pub fn shorten_uri(uri: &str) -> String {
    if let Some(scheme_end) = uri.find("://") {
        let scheme = &uri[..scheme_end + 3];
        let remainder = &uri[scheme_end + 3..];

        let after_credentials = match remainder.find('@') {
            Some(at) => &remainder[at + 1..],
            None => remainder,
        };

        let mut host_segment = after_credentials;
        if let Some(q_index) = host_segment.find('?') {
            host_segment = &host_segment[..q_index];
        }
        if let Some(path_index) = host_segment.find('/') {
            host_segment = &host_segment[..path_index];
        }

        if host_segment.is_empty() {
            return scheme.to_string();
        }

        return format!("{}{}", scheme, host_segment.trim_end_matches('/'));
    }

    uri.to_string()
}

#[cfg(test)]
mod tests {
    use super::shorten_uri;

    #[test]
    fn shortens_basic_uri() {
        assert_eq!(shorten_uri("mongodb://localhost:27017/test"), "mongodb://localhost:27017");
    }

    #[test]
    fn strips_credentials_and_params() {
        assert_eq!(
            shorten_uri("mongodb+srv://user:pass@cluster.mongodb.net/test?retryWrites=true&w=majority"),
            "mongodb+srv://cluster.mongodb.net"
        );
    }

    #[test]
    fn handles_no_scheme() {
        assert_eq!(shorten_uri("localhost:27017"), "localhost:27017");
    }
}
